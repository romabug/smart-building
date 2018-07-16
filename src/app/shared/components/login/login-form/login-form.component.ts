
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'login-form',
    templateUrl: './login-form.template.html',
    styleUrls: ['./login-form.styles.scss']
})
export class LoginFormComponent {
    @Input() public form: any = {};
    @Output() public event = new EventEmitter();

    public model: any = {};

    public login() {
        this.event.emit({ type: 'login', form: this.form });
    }

    public forgot() {
        this.event.emit({ type: 'forgot' });
    }
}

