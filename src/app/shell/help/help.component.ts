
import { Component, OnInit } from '@angular/core';
import { AppService } from '../../services/app.service';

@Component({
    selector: 'app-help',
    templateUrl: './help.template.html',
    styleUrls: ['./help.styles.scss']
})
export class HelpComponent implements OnInit {
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
        this.model.tiles = this.service.Settings.get('app.help.tiles');
        this.model.type = this.service.Settings.get('app.help.type');
        this.model.disclaimer = this.service.Settings.get('app.help.disclaimer');
        this.model.settings = this.service.Settings.get('app.help') || {};
    }

    public goto(item: any) {
        if (item.id) {
            this.service.navigate(item.id, item.query || {});
        } else if (item.link || item.url) {
            window.open(item.link || item.url, 'blank_');
        }
    }

}
