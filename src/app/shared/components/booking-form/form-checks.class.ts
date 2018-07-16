
import * as moment from 'moment';

export class FormChecks {


    public static checkDate(d: number) {
        const now = moment();
        const date = moment(d);
        if (date.isBefore(now, 'm')) {
            return { message: 'Booking needs to be made in the future' };
        }
        return null;
    }

    public static checkAttendees(model: any) {
        if (model.form && model.form.attendees) {
            if (model.form.room) {
                const rm = model.form.room;
                const peeps = model.form.attendees;
                if (!model.error) { model.error = {}; }
                const warn = rm.capacity && rm.capacity <= peeps.length;
                if (warn) {
                    const error = {
                        warn,
                        message: 'There are more attendess than the capacity of the space',
                    };
                    model.error.attendees = error;
                    return error;
                }
            }
            if (model.form.attendees.length < model.min_attendees) {
                return { message: `Minimum of ${model.min_attendees} attendee${model.min_attendees > 1 ? 's' : ''} is required` };
            }
        } else if (model.min_attendees) {
            return { message: `Minimum of ${model.min_attendees} attendee${model.min_attendees > 1 ? 's' : ''} is required` };
        }
    }

    constructor() {
        throw new Error('This is a static class');
    }
}
