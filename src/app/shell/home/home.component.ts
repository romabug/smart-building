
import { Component, OnInit } from '@angular/core';
import { AppService } from '../../services/app.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.template.html',
    styleUrls: ['./home.styles.scss']
})
export class HomeComponent implements OnInit {
    public model: any = {};

    private timers: any = {};

    constructor(private service: AppService) {  }

    public ngOnInit() {
        this.model.settings = {};
        this.init();
    }

    public init() {
        if (!this.service.Settings.setup) {
            return setTimeout(() => this.init(), 300);
        }
        this.model.tiles = this.service.Settings.get('app.tiles');
        this.model.banner = this.service.Settings.get('app.banner.home');
        this.model.background = this.service.Settings.get('app.home.background');
        this.model.disclaimer = this.service.Settings.get('app.home.disclaimer');
        this.model.settings = this.service.Settings.get('app.home') || {};
    }

    public goto(tile: any) {
        if (tile.id) {
            this.model.selected_tile = tile;
            setTimeout(() => {
                this.service.navigate(tile.id);
                setTimeout(() => this.model.selected_tile = null, 500);
            }, 1.5 * 1000);
        } else if (tile.url) {
            window.open(tile.url, 'blank_');
        }
    }
}
