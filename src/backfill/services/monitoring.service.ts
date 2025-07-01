import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { ConfigService } from "@nestjs/config"
import type { BackfillJobService } from "./backfill-job.service"
import type { BackfillService } from "./backfill.service"

export interface SystemMetrics {
  timestamp: Date
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: number
  uptime: number
  activeJobs: number
  queueStats: any
  jobStats: any
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name)
  private metrics: SystemMetrics[] = []
  private readonly maxMetricsHistory = 1000

  constructor(
    private readonly configService: ConfigService,
    private readonly backfillJobService: BackfillJobService,
    private readonly backfillService: BackfillService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectMetrics() {
    try {
      const [queueStats, jobStats, activeJobs] = await Promise.all([
        this.backfillService.getQueueStats(),
        this.backfillJobService.getJobStats(),
        this.backfillJobService.getActiveJobs(),
      ])

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
        uptime: process.uptime(),
        activeJobs: activeJobs.length,
        queueStats,
        jobStats,
      }

      this.metrics.push(metrics)

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory)
      }

      // Check for alerts
      await this.checkAlerts(metrics)
    } catch (error) {
      this.logger.error("Failed to collect metrics:", error.message)
    }
  }

  private async checkAlerts(metrics: SystemMetrics) {
    const alertThresholds = this.configService.get("backfill.monitoring.alertThresholds")

    // Check memory usage
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024
    if (memoryUsageMB > 1000) {
      // 1GB threshold
      this.logger.warn(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`)
    }

    // Check failed job rate
    const totalJobs = metrics.jobStats.total
    const failedJobs = metrics.jobStats.failed
    const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0

    if (failureRate > alertThresholds.failureRate) {
      this.logger.error(`High failure rate: ${(failureRate * 100).toFixed(2)}%`)
    }

    // Check queue backlogs
    Object.entries(metrics.queueStats).forEach(([queueName, stats]: [string, any]) => {
      if (stats.waiting > 100) {
        this.logger.warn(`Queue ${queueName} has ${stats.waiting} waiting jobs`)
      }
    })
  }

  getMetrics(limit = 100): SystemMetrics[] {
    return this.metrics.slice(-limit)
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  getAverageMetrics(minutes = 30): Partial<SystemMetrics> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)
    const recentMetrics = this.metrics.filter((m) => m.timestamp > cutoffTime)

    if (recentMetrics.length === 0) return {}

    const avgMemoryUsed = recentMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recentMetrics.length
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
    const avgActiveJobs = recentMetrics.reduce((sum, m) => sum + m.activeJobs, 0) / recentMetrics.length

    return {
      memoryUsage: { heapUsed: avgMemoryUsed } as NodeJS.MemoryUsage,
      cpuUsage: avgCpuUsage,
      activeJobs: avgActiveJobs,
    }
  }

  async getSystemHealth(): Promise<{
    status: "healthy" | "warning" | "critical"
    checks: Record<string, { status: string; message: string }>
  }> {
    const checks: Record<string, { status: string; message: string }> = {}
    let overallStatus: "healthy" | "warning" | "critical" = "healthy"

    try {
      // Check database connectivity
      const jobStats = await this.backfillJobService.getJobStats()
      checks.database = {
        status: "healthy",
        message: `Connected - ${jobStats.total} total jobs`,
      }
    } catch (error) {
      checks.database = {
        status: "critical",
        message: `Database connection failed: ${error.message}`,
      }
      overallStatus = "critical"
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024

    if (memoryUsageMB > 1500) {
      checks.memory = {
        status: "critical",
        message: `High memory usage: ${memoryUsageMB.toFixed(2)}MB`,
      }
      overallStatus = "critical"
    } else if (memoryUsageMB > 1000) {
      checks.memory = {
        status: "warning",
        message: `Elevated memory usage: ${memoryUsageMB.toFixed(2)}MB`,
      }
      if (overallStatus === "healthy") overallStatus = "warning"
    } else {
      checks.memory = {
        status: "healthy",
        message: `Memory usage: ${memoryUsageMB.toFixed(2)}MB`,
      }
    }

    // Check queue health
    try {
      const queueStats = await this.backfillService.getQueueStats()
      const totalWaiting = Object.values(queueStats).reduce((sum: number, stats: any) => sum + stats.waiting, 0)

      if (totalWaiting > 500) {
        checks.queues = {
          status: "warning",
          message: `High queue backlog: ${totalWaiting} waiting jobs`,
        }
        if (overallStatus === "healthy") overallStatus = "warning"
      } else {
        checks.queues = {
          status: "healthy",
          message: `Queues healthy: ${totalWaiting} waiting jobs`,
        }
      }
    } catch (error) {
      checks.queues = {
        status: "critical",
        message: `Queue check failed: ${error.message}`,
      }
      overallStatus = "critical"
    }

    return { status: overallStatus, checks }
  }
}
