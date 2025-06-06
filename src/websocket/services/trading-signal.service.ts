import { Injectable, Logger } from "@nestjs/common"
import type { Repository } from "typeorm"
import { TradingSignal } from "../entities/trading-signal.entity"
import type { WebSocketService } from "./websocket.service"
import type { ConnectionManagerService } from "./connection-manager.service"
import { InjectRepository } from "@nestjs/typeorm"

export interface TradingSignalData {
  symbol: string
  action: "BUY" | "SELL" | "HOLD"
  price: number
  confidence: number
  timestamp: Date
  metadata?: any
}

@Injectable()
export class TradingSignalService {
  private readonly logger = new Logger(TradingSignalService.name)
  private readonly userSubscriptions = new Map<string, Set<string>>(); // userId -> Set of symbols

  constructor(
    @InjectRepository(TradingSignal)
    private readonly tradingSignalRepository: Repository<TradingSignal>,
    private readonly webSocketService: WebSocketService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  async subscribeUser(userId: string, symbols?: string[]) {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set())
    }

    const userSymbols = this.userSubscriptions.get(userId)

    if (symbols && symbols.length > 0) {
      symbols.forEach((symbol) => userSymbols.add(symbol.toUpperCase()))
    } else {
      // Subscribe to all signals if no specific symbols provided
      userSymbols.add("*")
    }

    this.logger.log(`User ${userId} subscribed to trading signals: ${symbols || "ALL"}`)
  }

  async unsubscribeUser(userId: string, symbols?: string[]) {
    if (!this.userSubscriptions.has(userId)) {
      return
    }

    const userSymbols = this.userSubscriptions.get(userId)

    if (symbols && symbols.length > 0) {
      symbols.forEach((symbol) => userSymbols.delete(symbol.toUpperCase()))
    } else {
      userSymbols.clear()
    }

    if (userSymbols.size === 0) {
      this.userSubscriptions.delete(userId)
    }

    this.logger.log(`User ${userId} unsubscribed from trading signals: ${symbols || "ALL"}`)
  }

  async broadcastTradingSignal(signalData: TradingSignalData) {
    // Store signal in database
    const signal = this.tradingSignalRepository.create({
      symbol: signalData.symbol,
      action: signalData.action,
      price: signalData.price,
      confidence: signalData.confidence,
      metadata: signalData.metadata,
      createdAt: new Date(),
    })

    await this.tradingSignalRepository.save(signal)

    // Broadcast to subscribed users
    const symbol = signalData.symbol.toUpperCase()

    for (const [userId, subscribedSymbols] of this.userSubscriptions.entries()) {
      if (subscribedSymbols.has("*") || subscribedSymbols.has(symbol)) {
        if (this.connectionManager.isUserOnline(userId)) {
          await this.webSocketService.broadcastToUser(userId, "trading-signal", {
            id: signal.id,
            ...signalData,
          })
        }
      }
    }

    // Broadcast to trading signals room
    await this.webSocketService.broadcastToRoom("trading-signals", "trading-signal", {
      id: signal.id,
      ...signalData,
    })

    this.logger.log(`Trading signal broadcasted for ${symbol}: ${signalData.action} at ${signalData.price}`)
  }

  async getRecentSignals(symbol?: string, limit = 50): Promise<TradingSignal[]> {
    const query = this.tradingSignalRepository
      .createQueryBuilder("signal")
      .orderBy("signal.createdAt", "DESC")
      .limit(limit)

    if (symbol) {
      query.where("signal.symbol = :symbol", { symbol: symbol.toUpperCase() })
    }

    return query.getMany()
  }

  async getSignalsByTimeRange(startDate: Date, endDate: Date, symbol?: string): Promise<TradingSignal[]> {
    const query = this.tradingSignalRepository
      .createQueryBuilder("signal")
      .where("signal.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate })
      .orderBy("signal.createdAt", "DESC")

    if (symbol) {
      query.andWhere("signal.symbol = :symbol", { symbol: symbol.toUpperCase() })
    }

    return query.getMany()
  }
}
