
import { RouterModule, Routes } from '@angular/router';
import { AppShellComponent } from './shell/shell.component';
import { HomeComponent } from './shell/home/home.component';
import { ExploreComponent } from './shell/explore/explore.component';
import { HelpComponent } from './shell/help/help.component';
import { ControlComponent } from './shell/control/control.component';
import { BookingComponent } from './shell/booking/booking.component';
import { ScheduleComponent } from './shell/schedule/schedule.component';
import { ViewMeetingComponent } from './shell/schedule/view-meeting/view-meeting.component';
import { CateringComponent } from './shell/catering/catering.component';

export const ROUTES: Routes = [
    { path: '', component: AppShellComponent, children: [
        { path: '', component: HomeComponent },
        { path: 'home', component: HomeComponent },
        { path: 'book', component: BookingComponent },
        { path: 'book/:page', component: BookingComponent },
        { path: 'explore', component: ExploreComponent },
        { path: 'explore/:search', component: ExploreComponent },
        { path: 'schedule', component: ScheduleComponent },
        { path: 'schedule/:date', component: ScheduleComponent },
        { path: 'schedule/view/:id', component: ViewMeetingComponent },
        { path: 'schedule/view', redirectTo: 'schedule' },
        { path: 'help', component: HelpComponent },
        { path: 'catering', component: CateringComponent },
        { path: 'support', component: HelpComponent },
        { path: 'control', component: ControlComponent }
    ] },
    { path: '**',      redirectTo: '' },
];
