export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recoverStaleJobs } = await import("./lib/jobs");
  try {
    const result = await recoverStaleJobs();
    if (result.failed || result.requeued) {
      console.log(
        `[boot] job recovery: ${result.failed} stale RUNNING job(s) failed and refunded, ${result.requeued} QUEUED job(s) re-dispatched`
      );
    }
  } catch (err) {
    console.error("[boot] job recovery failed", err);
  }
}
