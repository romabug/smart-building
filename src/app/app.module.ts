
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ServiceWorkerModule } from '@angular/service-worker';

import { ComposerModule } from '@acaprojects/ngx-composer';
import { WidgetsModule } from '@acaprojects/ngx-widgets';

import { AppComponent } from './app.component';
import { APP_COMPONENTS, APP_ENTRY_COMPONENTS } from './shell';
import { SERVICES } from './services/index';
import { ROUTES } from './app.routes';
import { environment } from '../environments/environment';

import './shared/mock';
import { OVERLAY_COMPONENTS } from './overlays';
import { SHARED_COMPONENTS, SHARED_ENTRY_COMPONENTS } from './shared/components';

@NgModule({
    declarations: [
        AppComponent,
        ...APP_COMPONENTS,
        ...APP_ENTRY_COMPONENTS,
        ...OVERLAY_COMPONENTS,
        ...SHARED_COMPONENTS,
        ...SHARED_ENTRY_COMPONENTS
    ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        RouterModule.forRoot(ROUTES, { useHash: true }),
        HttpClientModule,
        FormsModule,
        ServiceWorkerModule.register('__base__ngsw-worker.js', { enabled: environment.production }),
        WidgetsModule.forRoot(),
        ComposerModule.forRoot()
    ],
    providers: [ ],
    entryComponents: [
        ...APP_ENTRY_COMPONENTS,
        ...OVERLAY_COMPONENTS,
        ...SHARED_ENTRY_COMPONENTS
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
