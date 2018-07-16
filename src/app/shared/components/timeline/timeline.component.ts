
import { Component, ElementRef, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges } from '@angular/core';

import * as moment from 'moment';

@Component({
    selector: 'timeline',
    templateUrl: './timeline.template.html',
    styleUrls: ['./timeline.styles.scss'],
})
export class TimelineComponent implements OnInit, OnDestroy, OnChanges {
    @Input() public events: any[] = [];
    @Input() public booking: any = null;
    @Input() public start: number = 7;
    @Input() public end: number = 19;
    @Input() public now: boolean = true;
    @Input() public blocks: number = 2; // Number of blocks display for each hour e.g. 2 would display as 2 30 minute blocks per hour
    @Output() public overlap: any = new EventEmitter();
    @Output() public update: any = new EventEmitter();

    public block_count: number = 24;
    public block_list: any[] = [];
    public now_time: number = 8;
    public now_timer: any = null;
    public moving = false;

    private rect: any = {};
    private event_sig: string = '';

    constructor(private el: ElementRef) {
        this.start = moment().hours();
        if (this.start >= 12) {
            this.start = 11;
        }
        if (this.end <= this.start || this.end > 23) {
            this.end = this.start + 12;
        }
    }

    public ngOnInit() {
        this.initBlocks();
        if (!this.now_timer) {
            this.now_timer = setInterval(() => {
                const now = moment();
                this.now_time = now.hour() + (now.minute() / 60);
            }, 500);
        }
    }

    public ngOnDestroy() {
        if (this.now_timer) {
            clearInterval(this.now_timer);
            this.now_timer = null;
        }
    }

    public ngOnChanges(changes: any) {
        if (changes.start || changes.end || changes.blocks) {
            if (this.start >= 12) {
                this.start = 11.5;
            }
            if (this.end <= this.start || this.end > 23) {
                this.end = this.start + 12;
            }
            this.block_count = (this.end - this.start) * this.blocks + 1;
            this.initBlocks();
        }
    }

    public startMove(event: any) {
        this.rect = this.el.nativeElement.getBoundingClientRect();
        this.moving = true;
    }

    public move(event: any) {
        const c = event.center;
        const pos = { x: c.x - this.rect.left, y: c.y - this.rect.top };
        const time = this.end - this.start;
        if (pos.x < 0) {
            pos.x = 0;
        } else if (pos.x > this.rect.width) {
            pos.x = this.rect.width;
        }
        const ratio = pos.x / this.rect.width;
        const start = Math.floor((this.start + (ratio * time)) * (this.blocks * 2)) / (this.blocks * 2);
        this.booking.start_hours = start;
    }

    public endMove(event: any) {
        this.moving = false;
        this.update.emit(this.booking);
    }

    private initBlocks() {
        this.block_list = [];
        for (let i = 0; i <= this.block_count; i++) {
            const pos = i / this.blocks;
            let time = (this.start + pos) % 12;
            if (time === 0) {
                time = 12;
            }
            this.block_list.push({
                i: pos,
                h: time,
                is_hour: time === Math.floor(time),
            });
        }
    }
}



