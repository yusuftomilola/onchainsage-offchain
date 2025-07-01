import { Injectable, Logger } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  accuracy: number
}

export interface PriceDataPoint {
  price: number
  volume: number
  timestamp: Date
  source: string
}

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name)
  private readonly priceDeviationThreshold: number
  private readonly volumeThreshold: number
  private readonly requiredAccuracy: number

  constructor(private readonly configService: ConfigService) {
    this.priceDeviationThreshold = this.configService.get("backfill.validation.priceDeviationThreshold")
    this.volumeThreshold = this.configService.get("backfill.validation.volumeThreshold")
    this.requiredAccuracy = this.configService.get("backfill.validation.requiredAccuracy")
  }

  validatePriceData(data: PriceDataPoint[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      accuracy: 1.0,
    }

    if (data.length === 0) {
      result.errors.push("No data points provided")
      result.isValid = false
      result.accuracy = 0
      return result
    }

    let validPoints = 0
    const totalPoints = data.length

    for (let i = 0; i < data.length; i++) {
      const point = data[i]
      let pointValid = true

      // Check for null/undefined values
      if (point.price == null || point.volume == null || !point.timestamp) {
        result.errors.push(`Invalid data at index ${i}: missing required fields`)
        pointValid = false
      }

      // Check for negative prices
      if (point.price < 0) {
        result.errors.push(`Invalid price at index ${i}: negative price ${point.price}`)
        pointValid = false
      }

      // Check for extremely low volume
      if (point.volume < this.volumeThreshold) {
        result.warnings.push(`Low volume at index ${i}: ${point.volume}`)
      }

      // Check for price deviation (if we have previous data)
      if (i > 0 && pointValid) {
        const prevPrice = data[i - 1].price
        const deviation = Math.abs(point.price - prevPrice) / prevPrice

        if (deviation > this.priceDeviationThreshold) {
          result.warnings.push(`High price deviation at index ${i}: ${(deviation * 100).toFixed(2)}%`)
        }
      }

      // Check timestamp ordering
      if (i > 0 && point.timestamp <= data[i - 1].timestamp) {
        result.errors.push(`Invalid timestamp ordering at index ${i}`)
        pointValid = false
      }

      if (pointValid) validPoints++
    }

    result.accuracy = validPoints / totalPoints
    result.isValid = result.accuracy >= this.requiredAccuracy && result.errors.length === 0

    this.logger.debug(
      `Validation result: ${validPoints}/${totalPoints} valid points (${(result.accuracy * 100).toFixed(2)}%)`,
    )

    return result
  }

  validateSocialSentimentData(data: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      accuracy: 1.0,
    }

    if (data.length === 0) {
      result.warnings.push("No social sentiment data provided")
      return result
    }

    let validPoints = 0

    for (let i = 0; i < data.length; i++) {
      const point = data[i]
      let pointValid = true

      // Check required fields
      if (!point.platform || !point.timestamp || point.sentimentScore == null) {
        result.errors.push(`Invalid sentiment data at index ${i}: missing required fields`)
        pointValid = false
      }

      // Check sentiment score range
      if (point.sentimentScore < -1 || point.sentimentScore > 1) {
        result.errors.push(`Invalid sentiment score at index ${i}: ${point.sentimentScore} (must be between -1 and 1)`)
        pointValid = false
      }

      // Check mention counts
      if (point.mentionCount < 0 || point.positiveCount < 0 || point.negativeCount < 0) {
        result.errors.push(`Invalid mention counts at index ${i}: negative values not allowed`)
        pointValid = false
      }

      if (pointValid) validPoints++
    }

    result.accuracy = validPoints / data.length
    result.isValid = result.accuracy >= this.requiredAccuracy && result.errors.length === 0

    return result
  }

  validateTradingPatternData(data: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      accuracy: 1.0,
    }

    if (data.length === 0) {
      result.errors.push("No trading pattern data provided")
      result.isValid = false
      result.accuracy = 0
      return result
    }

    let validPoints = 0

    for (let i = 0; i < data.length; i++) {
      const point = data[i]
      let pointValid = true

      // Check OHLC data
      if (point.open == null || point.high == null || point.low == null || point.close == null) {
        result.errors.push(`Invalid OHLC data at index ${i}: missing values`)
        pointValid = false
      }

      // Check OHLC relationships
      if (pointValid) {
        if (point.high < Math.max(point.open, point.close) || point.low > Math.min(point.open, point.close)) {
          result.errors.push(`Invalid OHLC relationships at index ${i}`)
          pointValid = false
        }
      }

      // Check volume
      if (point.volume < 0) {
        result.errors.push(`Invalid volume at index ${i}: negative value`)
        pointValid = false
      }

      if (pointValid) validPoints++
    }

    result.accuracy = validPoints / data.length
    result.isValid = result.accuracy >= this.requiredAccuracy && result.errors.length === 0

    return result
  }
}
