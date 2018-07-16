

/*
* @Author: Alex Sorafumo
* @Date:   2017-05-17 12:46:47
* @Last Modified by:   Alex Sorafumo
* @Last Modified time: 2017-05-17 12:54:11
*/

import { UserSearchComponent } from './user-search.component';
import { UserSearchListComponent } from './user-list/user-list.component';
import { UserSearchDisplayComponent } from './user-display/user-display.component';

export * from './user-search.component';

export const USER_SEARCH_COMPONENTS: any[] = [
    UserSearchComponent,
    UserSearchDisplayComponent,
    UserSearchListComponent
];
