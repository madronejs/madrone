// vite.config.ts starts test workers with --expose-gc
const { gc } = globalThis as unknown as { gc: () => void };

/** Runs a full GC after the current job, when WeakRef targets read in it are released. */
export async function collect() {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    gc();
  }
}
