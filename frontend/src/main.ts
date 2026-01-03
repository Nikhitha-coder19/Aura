import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

console.log('🚀 Bootstrapping AURA...');
bootstrapApplication(App, appConfig)
  .then(() => console.log('✅ Bootstrap Complete'))
  .catch((err) => {
    console.error('❌ Bootstrap Failed:', err);
    document.body.innerHTML += `<div style="color:red; background:white; padding:20px;">BOOTSTRAP ERROR: ${err.message}</div>`;
  });
