import { Controller, Post, Get, Patch } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import type { BackfillService } from "../services/backfill.service"
import type { BackfillJobService, CreateBackfillJobDto } from "../services/backfill-job.service"
import { BackfillJobType } from "../entities/backfill-job.entity"

@ApiTags("backfill")
@Controller("backfill")
export class BackfillController {
  constructor(
    private readonly backfillService: BackfillService,
    private readonly backfillJobService: BackfillJobService,
  ) {}

  @Post("jobs")
  @ApiOperation({ summary: "Create a new backfill job" })
  @ApiResponse({ status: 201, description: "Job created successfully" })
  async createBackfillJob(createJobDto: CreateBackfillJobDto) {
    const job = await this.backfillJobService.createJob(createJobDto)

    // Start the job processing
    await this.backfillService.startBackfillJob(job.id)

    return {
      success: true,
      jobId: job.id,
      message: "Backfill job created and started successfully",
    }
  }

  @Post("jobs/price-data")
  @ApiOperation({ summary: "Create a price data backfill job" })
  async createPriceDataJob(body: {
    tokenIds: string[]
    startDate: string
    endDate: string
    sources?: string[]
  }) {
    const job = await this.backfillJobService.createJob({
      type: BackfillJobType.PRICE_DATA,
      tokenIds: body.tokenIds,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      configuration: {
        sources: body.sources || ["coingecko", "uniswap"],
        batchSize: 50,
      },
    })

    await this.backfillService.startBackfillJob(job.id)

    return {
      success: true,
      jobId: job.id,
      message: "Price data backfill job started",
    }
  }

  @Post("jobs/social-sentiment")
  @ApiOperation({ summary: "Create a social sentiment backfill job" })
  async createSocialSentimentJob(body: {
    tokenIds: string[]
    startDate: string
    endDate: string
    platforms?: string[]
  }) {
    const job = await this.backfillJobService.createJob({
      type: BackfillJobType.SOCIAL_SENTIMENT,
      tokenIds: body.tokenIds,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      configuration: {
        platforms: body.platforms || ["twitter", "reddit"],
        batchSize: 30,
      },
    })

    await this.backfillService.startBackfillJob(job.id)

    return {
      success: true,
      jobId: job.id,
      message: "Social sentiment backfill job started",
    }
  }

  @Get("jobs")
  @ApiOperation({ summary: "Get all backfill jobs" })
  async getJobs(limit?: number) {
    const jobs = await this.backfillJobService.getJobHistory(limit || 50)
    return {
      success: true,
      jobs,
    }
  }

  @Get("jobs/active")
  @ApiOperation({ summary: "Get active backfill jobs" })
  async getActiveJobs() {
    const jobs = await this.backfillJobService.getActiveJobs()
    return {
      success: true,
      jobs,
    }
  }

  @Get("jobs/stats")
  @ApiOperation({ summary: "Get backfill job statistics" })
  async getJobStats() {
    const stats = await this.backfillJobService.getJobStats()
    return {
      success: true,
      stats,
    }
  }

  @Get("jobs/:jobId")
  @ApiOperation({ summary: "Get backfill job details" })
  async getJob(jobId: string) {
    const job = await this.backfillJobService.getJob(jobId)
    return {
      success: true,
      job,
    }
  }

  @Patch("jobs/:jobId/pause")
  @ApiOperation({ summary: "Pause a backfill job" })
  async pauseJob(jobId: string) {
    await this.backfillJobService.pauseJob(jobId)
    return {
      success: true,
      message: "Job paused successfully",
    }
  }

  @Patch("jobs/:jobId/resume")
  @ApiOperation({ summary: "Resume a paused backfill job" })
  async resumeJob(jobId: string) {
    await this.backfillJobService.resumeJob(jobId)
    await this.backfillService.startBackfillJob(jobId)
    return {
      success: true,
      message: "Job resumed successfully",
    }
  }

  @Get("monitoring/dashboard")
  @ApiOperation({ summary: "Get monitoring dashboard data" })
  async getMonitoringDashboard() {
    const [stats, activeJobs, recentJobs] = await Promise.all([
      this.backfillJobService.getJobStats(),
      this.backfillJobService.getActiveJobs(),
      this.backfillJobService.getJobHistory(10),
    ])

    return {
      success: true,
      dashboard: {
        stats,
        activeJobs: activeJobs.length,
        recentActivity: recentJobs,
        systemHealth: {
          status: "healthy",
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      },
    }
  }
}
