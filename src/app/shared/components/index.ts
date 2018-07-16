
import { BookingFormComponent } from './booking-form/booking-form.component';
import { BuildingSelectComponent } from './building-select/building-select.component';
import { TimelineComponent } from './timeline/timeline.component';
import { LOGIN_COMPONENTS } from './login';
import { USER_SEARCH_COMPONENTS } from './user-search';
import { RoomInfoComponent } from './room-info/room-info.component';

export const SHARED_COMPONENTS: any[] = [
    BookingFormComponent,
    BuildingSelectComponent,
    TimelineComponent,
    ...LOGIN_COMPONENTS,
    ...USER_SEARCH_COMPONENTS
];

export const SHARED_ENTRY_COMPONENTS: any[] = [
    RoomInfoComponent
];
