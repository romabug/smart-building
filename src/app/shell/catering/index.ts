
import { CateringComponent } from './catering.component';
import { CATERING_CONTENT_COMPONENTS } from './components';

export * from './catering.component';

export const CATERING_COMPONENTS: any[] = [
    CateringComponent,
    ...CATERING_CONTENT_COMPONENTS
];
