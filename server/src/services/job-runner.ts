import { db } from "../db";
import { jobRuns } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { storage } from "../../storage";

export interface JobDefinition {
  name: string;
  description: string;
  schedule: "daily" | "weekly" | "hourly" | { intervalMs: number };
  handler: () => Promise<JobResult>;
  getRunKey: () => string;
  enabled?: boolean;
}

export interface JobResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

interface ScheduledJob extends JobDefinition {
  lastRun?: Date;
  nextRun?: Date;
  timer?: NodeJS.Timeout;
}

class JobRunner {
  private jobs: Map<string, ScheduledJob> = new Map();
  private running = false;

  register(job: JobDefinition): void {
    if (this.jobs.has(job.name)) {
      console.log(`[JOB-RUNNER] Job ${job.name} already registered, skipping`);
      return;
    }

    this.jobs.set(job.name, {
      ...job,
      enabled: job.enabled !== false,
    });
    console.log(`[JOB-RUNNER] Registered job: ${job.name}`);
  }

  private getIntervalMs(schedule: JobDefinition["schedule"]): number {
    if (typeof schedule === "object") return schedule.intervalMs;
    switch (schedule) {
      case "hourly": return 60 * 60 * 1000;
      case "daily": return 24 * 60 * 60 * 1000;
      case "weekly": return 7 * 24 * 60 * 60 * 1000;
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      console.log("[JOB-RUNNER] Already running");
      return;
    }

    this.running = true;
    console.log(`[JOB-RUNNER] Starting job runner with ${this.jobs.size} jobs`);

    const entries = Array.from(this.jobs.entries());
    for (const [name, job] of entries) {
      if (!job.enabled) {
        console.log(`[JOB-RUNNER] Job ${name} is disabled, skipping`);
        continue;
      }

      const intervalMs = this.getIntervalMs(job.schedule);
      
      this.runJobIfDue(job);
      
      job.timer = setInterval(() => {
        this.runJobIfDue(job);
      }, Math.min(intervalMs, 60 * 60 * 1000));
    }
  }

  stop(): void {
    this.running = false;
    const jobs = Array.from(this.jobs.values());
    for (const job of jobs) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
      }
    }
    console.log("[JOB-RUNNER] Stopped");
  }

  private async runJobIfDue(job: ScheduledJob): Promise<void> {
    const runKey = job.getRunKey();
    
    const exists = await this.checkRunExists(runKey);
    if (exists) {
      return;
    }

    await this.executeJob(job, runKey);
  }

  async runNow(jobName: string, forceNewKey = false): Promise<JobResult> {
    const job = this.jobs.get(jobName);
    if (!job) {
      return { success: false, message: `Job ${jobName} not found` };
    }

    const runKey = forceNewKey ? `${job.getRunKey()}:manual:${Date.now()}` : job.getRunKey();
    
    if (!forceNewKey) {
      const exists = await this.checkRunExists(runKey);
      if (exists) {
        return { success: false, message: `Job already ran for key: ${runKey}` };
      }
    }

    return this.executeJob(job, runKey);
  }

  private async checkRunExists(runKey: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(eq(jobRuns.runKey, runKey))
      .limit(1);
    return !!existing;
  }

  private async executeJob(job: ScheduledJob, runKey: string): Promise<JobResult> {
    const startTime = Date.now();
    console.log(`[JOB-RUNNER] Starting job: ${job.name} (key: ${runKey})`);

    let runId: string;
    try {
      const [inserted] = await db
        .insert(jobRuns)
        .values({
          jobName: job.name,
          runKey,
          status: "running",
          startedAt: new Date(),
        })
        .returning({ id: jobRuns.id });
      
      runId = inserted.id;
    } catch (error: any) {
      if (error.code === "23505") {
        console.log(`[JOB-RUNNER] Duplicate run detected for ${runKey}, skipping`);
        return { success: false, message: "Duplicate run" };
      }
      throw error;
    }

    try {
      const result = await job.handler();
      const durationMs = Date.now() - startTime;

      await db
        .update(jobRuns)
        .set({
          status: result.success ? "completed" : "failed",
          completedAt: new Date(),
          durationMs,
          result: result.data || { message: result.message },
          errorMessage: result.success ? null : result.message,
        })
        .where(eq(jobRuns.id, runId));

      console.log(`[JOB-RUNNER] Job ${job.name} ${result.success ? "completed" : "failed"} in ${durationMs}ms`);

      if (!result.success) {
        await storage.createAuditLog({
          actor: "system",
          action: "job.failed",
          entityType: "job",
          entityId: runId,
          metadata: { jobName: job.name, runKey, error: result.message },
        });
      }

      job.lastRun = new Date();
      return result;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error.message || "Unknown error";

      await db
        .update(jobRuns)
        .set({
          status: "failed",
          completedAt: new Date(),
          durationMs,
          errorMessage,
        })
        .where(eq(jobRuns.id, runId));

      console.error(`[JOB-RUNNER] Job ${job.name} threw error:`, errorMessage);

      await storage.createAuditLog({
        actor: "system",
        action: "job.error",
        entityType: "job",
        entityId: runId,
        metadata: { jobName: job.name, runKey, error: errorMessage },
      });

      return { success: false, message: errorMessage };
    }
  }

  async getStatus(): Promise<{
    running: boolean;
    jobs: Array<{
      name: string;
      description: string;
      schedule: string;
      enabled: boolean;
      lastRun?: Date;
    }>;
    recentRuns: Array<{
      id: string;
      jobName: string;
      runKey: string;
      status: string;
      startedAt: Date;
      completedAt?: Date | null;
      durationMs?: number | null;
      errorMessage?: string | null;
    }>;
  }> {
    const recentRuns = await db
      .select({
        id: jobRuns.id,
        jobName: jobRuns.jobName,
        runKey: jobRuns.runKey,
        status: jobRuns.status,
        startedAt: jobRuns.startedAt,
        completedAt: jobRuns.completedAt,
        durationMs: jobRuns.durationMs,
        errorMessage: jobRuns.errorMessage,
      })
      .from(jobRuns)
      .orderBy(desc(jobRuns.startedAt))
      .limit(50);

    return {
      running: this.running,
      jobs: Array.from(this.jobs.values()).map(j => ({
        name: j.name,
        description: j.description,
        schedule: typeof j.schedule === "object" ? `every ${j.schedule.intervalMs / 1000}s` : j.schedule,
        enabled: j.enabled !== false,
        lastRun: j.lastRun,
      })),
      recentRuns,
    };
  }

  getRegisteredJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

export const jobRunner = new JobRunner();
