
import { AppShellComponent } from './shell.component';
import { HomeComponent } from './home/home.component';
import { HelpComponent } from './help/help.component';
import { EXPLORE_COMPONENTS } from './explore';
import { CONTROL_COMPONENTS } from './control';
import { BOOKING_COMPONENTS } from './booking';
import { EVENT_COMPONENTS } from './events';
import { SCHEDULE_COMPONENTS } from './schedule';
import { CATERING_COMPONENTS } from './catering';

export const APP_COMPONENTS: any[] = [
    AppShellComponent,
    HomeComponent,
    HelpComponent,
    ...BOOKING_COMPONENTS,
    ...CATERING_COMPONENTS,
    ...CONTROL_COMPONENTS,
    ...EXPLORE_COMPONENTS,
    // ...EVENT_COMPONENTS,
    ...SCHEDULE_COMPONENTS
];

export const APP_ENTRY_COMPONENTS: any[] = [

];
