if(process.env.DSH_COMPANION_PET_WORKER==='1')await import('./pet-backend/worker.cjs');
else await import('./main.mjs');
