
import { BookingsService } from './bookings.service';
import { BuildingsService } from './buildings.service';
import { CateringService } from './catering.service';
import { RoomsService } from './rooms.service';
import { UsersService } from './users.service';
import { CommentsService } from './comments.service';
import { AnalyticsService } from './analytics.service';

export const DATA_SERVICES: any[] = [
    AnalyticsService,
    BookingsService,
    BuildingsService,
    CateringService,
    CommentsService,
    RoomsService,
    UsersService
];
