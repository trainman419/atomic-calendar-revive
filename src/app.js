﻿import { LitElement, html, css } from 'lit-element';
import moment from 'moment';
import 'moment/min/locales';
import pkg from '../package.json';
import "@material/mwc-linear-progress";

const CARD_VERSION = pkg.version;

class AtomicCalendarRevive extends LitElement {
	static get properties() {
		return {
			hass: { type: Object },
			_config: { type: Object },
			content: { type: Object },
			selectedMonth: { type: Object }
		};
	}

	constructor() {
		super();
		this.lastCalendarUpdateTime;
		this.lastEventsUpdateTime;
		this.lastHTMLUpdateTime;
		this.events;
		this.content = html``;
		this.shouldUpdateHtml = true;
		this.errorMessage = '';
		this.modeToggle = 0;
		this.selectedMonth = moment();
		this.refreshCalEvents = null;
		this.monthToGet = moment().format("MM");
		this.month = [];
    this.days = [];
		this.showLoader = false;
		this.eventSummary = html`&nbsp;`;
		this.firstrun = true;
		this.language = '';
	}

	static async getConfigElement() {
		await import("./app-editor.js");
		return document.createElement("atomic-calendar-revive-editor");
	}

	static getStubConfig() {
		return {
			name: "Calendar Card",
			enableModeChange: true
		}
	}

	setConfig(config) {
		config = JSON.parse(JSON.stringify(config));
		if (!config.entities || !config.entities.length) {
			throw new Error('Please define atomic-calendar-revive card entity');
		}

		this._config = {
			// text translations
			fullDayEventText: 'All day', // "All day" custom text
			untilText: 'Until', // "Until" custom text
			language: '',

			// main settings
			maxDaysToShow: 7, // maximum days to show (if zero, show only currently running events)
			maxEventCount: 0, // maximum number of events to show (if zero, unlimited)
			showLoader: true, // show animation when loading events from Google calendar

			showLocation: true, // show location (right side)
			showMonth: false, // show month under day (left side)
			showWeekDay: false, // show day name under day (left side)
			fullTextTime: true, // show advanced time messages, like: All day, until Friday 12
			showCurrentEventLine: false, // show a line between last and next event
			showDate: false,
			dateFormat: 'LL',
			hoursFormat: 'default', // 12h / 24h / default time format. Default is HA language setting.
			startDaysAhead: 0, // shows the events starting on x days from today. Default 0.
			showLastCalendarWeek: false, // always shows last line/week in calendar mode, even if it's not the current month
			showCalNameInEvent: false,
			sortByStartTime: false, // sort first by calendar, then by time
			disableEventLink: false, // disables links to event calendar
			disableLocationLink: false, // disables links to event calendar
			linkTarget: '_blank', // Target for links, can use any HTML target type

			// color and font settings
			nameColor: 'var(--primary-text-color)', // Card Name color

			dateColor: 'var(--primary-text-color)', // Date text color (left side)
			dateSize: 90, //Date text size (percent of standard text)

			descColor: 'var(--primary-text-color)', // Description text color (left side)
			descSize: 80, //Description text size (percent of standard text)

			showNoEventsForToday: false,
			noEventsForTodayText: 'No events for today',
			noEventsForNextDaysText: 'No events in the next days',

			timeColor: 'var(--primary-color)', // Time text color (center bottom)
			timeSize: 90, //Time text size
			showHours: true, //shows the bottom line (time, duration of event)

			eventTitleColor: 'var(--primary-text-color)', //Event title settings (center top), if no custom color set
			eventTitleSize: 100,

			locationIconColor: 'rgb(--primary-text-color)', //Location link settings (right side)
			locationLinkColor: 'var(--primary-text-color)',
			locationTextSize: 90,

			// finished events settings
			hideFinishedEvents: false, // show finished events
			dimFinishedEvents: true, // make finished events greyed out or set opacity
			finishedEventOpacity: 0.6, // opacity level
			finishedEventFilter: 'grayscale(100%)', // css filter

			// days separating
			dayWrapperLineColor: 'var(--primary-text-color)', // days separating line color
			eventBarColor: 'var(--primary-color)',

			eventCalNameColor: 'var(--primary-text-color)',
			eventCalNameSize: 90,

			showProgressBar: true,
			showFullDayProgress: false,
			progressBarColor: 'var(--primary-color)',

			showDeclined: false,

			enableModeChange: false,
			defaultMode: 1,

			// Calendar Mode Default Settings

			calGridColor: 'rgba(86, 86, 86, .35)',
			calDayColor: 'var(--primary-text-color)',
			calWeekDayColor: 'var(--primary-text-color)',
			calDateColor: 'var(--primary-text-color)',
			defaultCalColor: 'var(--primary-text-color)',

			calEventBackgroundColor: 'rgba(86, 100, 86, .35)',
			calEventBackgroundFilter: null,

			calActiveEventBackgroundColor: 'rgba(86, 128, 86, .35)',
			calActiveEventBackgroundFilter: null,

			calEventSatColor: 'rgba(255, 255, 255, .05)',
			calEventSunColor: 'rgba(255, 255, 255, .15)',


			calEventHolidayColor: 'red',
			calEventHolidayFilter: null,

			calEventIcon1: 'mdi:gift',
			calEventIcon1Color: 'var(--primary-text-color)',
			calEventIcon1Filter: null,

			calEventIcon2: 'mdi:home',
			calEventIcon2Color: 'var(--primary-text-color)',
			calEventIcon2Filter: null,

			calEventIcon3: 'mdi:star',
			calEventIcon3Color: 'var(--primary-text-color)',
			calEventIcon3Filter: null,

			calEventTime: false, // show calendar event summary time

			firstDayOfWeek: 1, // default 1 - monday
			blacklist: null,
			whitelist: null,
			...config
		}

		this.modeToggle = this._config.defaultMode

		if (typeof this._config.entities === 'string')
			this._config.entities = [{
				entity: config.entities
			}];
		this._config.entities.forEach((entity, i) => {
			if (typeof entity === 'string')
				this._config.entities[i] = {
					entity: entity
				};
		});
	}

	updated() { }

	render() {
		if (this.firstrun) {
			console.info(
				`%c atomic-calendar-revive %c Version: ${CARD_VERSION} `,
				"color: white; background: #484848; font-weight: 700;",
				"color: white; background: #cc5500; font-weight: 700;"
			);
		}
		if (!this._config || !this.hass) {
			return html``;
		}
		this.updateCard();

		return html`

	  ${this.setStyle()}

		<ha-card class="cal-card">
		${this._config.name || this._config.showDate || (this.showLoader && this._config.showLoader)
				? html`
			<div class="cal-nameContainer">
				${this._config.name
						? html`
						<div  class="cal-name"  @click='${e => this.handleToggle()}'>
						${this._config.name}
						</div>
						`
						: ""}

				${(this.showLoader && this._config.showLoader) ? html`
					<div  class="loader" ></div>` : ''
					}
				${this._config.showDate
						? html`
					<div class="calDate">
					${this.getDate()}
					</div>
					`
						: ""}
			</div>
			`
				: ""
			}

		<div class="cal-eventContainer" style="padding-top: 4px;">
			${this.content}
		</div>
	  </ha-card>`
	}

	async updateCard() {
		this.language = this._config.language != '' ? this._config.language : this.hass.language.toLowerCase()
		let timeFormat = moment.localeData(this.language).longDateFormat('LT')
		if (this._config.hoursFormat == '12h') timeFormat = 'h:mm A'
		else if (this._config.hoursFormat == '24h') timeFormat = 'H:mm'
		else if (this._config.hoursFormat != 'default') timeFormat = this._config.hoursFormat
		moment.updateLocale(this.language, {
			week: {
				dow: this._config.firstDayOfWeek
			},
			longDateFormat: {
				LT: timeFormat
			}
		});
		this.firstrun = false

		// check if an update is needed
		if (!this.isUpdating && this.modeToggle == 1) {
			if (!this.lastEventsUpdateTime || moment().diff(this.lastEventsUpdateTime, 'seconds') > 60) {
				this.showLoader = true
				this.isUpdating = true;
				try {
					this.events = await this.getEvents()
				} catch (error) {
					console.log(error)
					this.errorMessage = 'The calendar can\'t be loaded from Home Assistant component'
					this.showLoader = false
				}

				this.lastEventsUpdateTime = moment();
				this.updateEventsHTML(this.events);
				this.isUpdating = false;
				this.showLoader = false
			}
		}

		if (this.modeToggle == 1)
			this.updateEventsHTML(this.events);
    else if(this.modeToggle == 2)
			this.updateCalendarHTML(this.events);
    else
			this.updateTwoWeekHTML(this.events);
	}

	handleToggle() {
		if (this._config.enableModeChange) {
      this.modeToggle = (this.modeToggle % 3) + 1;
			this.requestUpdate();
		}
	}

	getDate() {
		const date = moment().format(this._config.dateFormat)
		return html`${date}`
	}

	setStyle() {
		return html`
		<style>
			.cal-card{
				cursor: default;
				padding: 16px;
			}

			.cal-name {
				font-size: var(--paper-font-headline_-_font-size);
				color: ${this._config.nameColor};
				padding: 4px 8px 12px 0px;
				line-height: 40px;
				cursor: default;
				float:left;
			}

			.cal-nameContainer {
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			    vertical-align: middle;
				align-items: center;
				margin: 0 8px 0 2px;
			}

			.calDate {
			    font-size: var(--paper-font-headline_-_font-size);
				font-size: 1.3rem;
    			font-weight: 400;
				color: var(--primary-text-color);
				padding: 4px 8px 12px 0px;
				line-height: 40px;
				cursor: default;
				float:right;
				opacity: .75;
			}

			table{
				color:black;
				margin-left: 0px;
				margin-right: 0px;
				border-spacing: 10px 5px;
				border-collapse: collapse;
			}

			td {
				padding: 4px 0 4px 0;
			}

			.daywrap{
				padding: 2px 0 4px 0;
				border-top: 1px solid;
			}

			tr{
				width: 100%;
			}

			.event-left {
				padding: 4px 10px 3px 8px;
				text-align: center;
				vertical-align: top;
			}

			.daywrap > td {
				padding-top: 8px;
			}

			.event-right {
				display: flex;
				justify-content: space-between;
				padding: 0px 5px 0 5px;
			}

			.event-description {
				display: flex;
				justify-content: space-between;
				padding: 0px 5px 0 5px;
			}

			.event-main {
				flex-direction:row nowrap;
				display: inline-block;
			    vertical-align: top;
			}

			.event-location {
				text-align: right;
				display: inline-block;
				vertical-align: top;
			}

			.event-title {
				font-size: ${this._config.eventTitleSize}%;
			}

			.event-location-icon {
				--mdc-icon-size: 15px;
				color: ${this._config.locationIconColor};
				height: 15px;
        width: 15px;
				margin-top: -2px;
			}

			.location-link {
				text-decoration: none;
				color: ${this._config.locationLinkColor};
				font-size: ${this._config.locationTextSize}%;
			}

			.event-circle {
				width: 10px;
				height: 10px;
				margin-left: -2px
			}

			hr.event {
				color: ${this._config.eventBarColor};
				margin: -8px 0px 2px 0px;
				border-width: 1px 0 0 0;
			}

			.event-cal-name {
				color: ${this._config.eventCalNameColor};
				font-size: ${this._config.eventCalNameSize}%;
			}
			.event-cal-name-icon {
				width: 15px;
			  height: 15px;
        width: 15px;
			}

			.eventBar {
				margin-top: -10px;
				margin-bottom: 0px;
			}

			.progress-bar {
      	--mdc-linear-progress-buffer-color: ${this._config.progressBarColor};
      }

			mwc-linear-progress {
        width: 100%;
        margin: auto;
      }

			table.cal{
				margin-left: 0px;
				margin-right: 0px;
				border-spacing: 10px 5px;
				border-collapse: collapse;
				width: 100%;
				table-layout:fixed;
			}

			td.cal {
				padding: 5px 5px 5px 5px;
				border: 1px solid ${this._config.calGridColor};
				text-align: center;
				vertical-align: middle;
				width:100%;
			}

			.calDay {
				max-height: 38px;
				font-size: 95%;
				max-width: 38px;
				margin: auto;
			}

			tr.cal {
				width: 100%;
			}

			table.week{
				margin-left: 0px;
				margin-right: 0px;
				border-spacing: 10px 5px;
				border-collapse: collapse;
				width: 100%;
				table-layout:fixed;
			}

			td.week {
				padding: 1px 1px 1px 1px;
				border: 1px solid ${this._config.calGridColor};
				text-align: left;
				vertical-align: top;
				width:100%;
        white-space: nowrap;
        overflow: hidden;
			}

			.weekDay {
				font-size: 95%;
				margin: auto;
			}

			tr.week {
				width: 100%;
			}

			ha-icon-button {
				--mdc-icon-size: 20px;
				--mdc-icon-button-size: 25px;
				color: ${this._config.calDateColor};
			}

			.calTableContainer {
				width: 100%;
			}
			.summary-event-div{
				padding-top: 3px;
			}

			.bullet-event-div{
				-webkit-border-radius: 8px;
				border-radius: 8px;
				border: 4px solid;
				height: 0;
				width: 0;
				display: inline-block;
				vertical-align: middle;
			}
			.bullet-event-span{
				overflow: hidden;
				white-space: nowrap;
				display: inline-block;
				vertical-align: middle;
				margin: 0 5px;
				text-decoration: none!important;
			}
			.summary-fullday-div{
				-webkit-border-radius: 5px;
				border-radius: 5px;
				border: 2px solid;
				border-left: 7px solid;
				padding: 0 4px;
				margin: 5px 0;
    		height: 18px;
    		line-height: 16px;
			}

			.calIcon {
				--mdc-icon-size: 10px;
				width: 10px;
				height:10px;
				padding-top: 0px;
				margin-top: -10px;
				margin-right: -1px;
				margin-left: -1px;
			}

			.calDateSelector {
				display: inline-block;
				min-width: 9em;
				text-align: center;
			}

			.loader {
				border: 4px solid #f3f3f3;
				border-top: 4px solid grey;
				border-radius: 50%;
				width: 14px;
				height: 14px;
				animation: spin 2s linear infinite;
				float:left;
			}

			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
		</style>
		`
	}

	// The height of your card. Home Assistant uses this to automatically
	// distribute all cards over the available columns.
	getCardSize() {
		return this._config.entities.length + 1;
	}

	_toggle(state) {
		this.hass.callService('homeassistant', 'toggle', {
			entity_id: state.entity_id
		});
	}

	/**
	 * generate Event Title (summary) HTML
	 *
	 */
	getTitleHTML(event) {
		const titletext = (this._config.showCalNameInEvent) ? event.eventClass.organizer.displayName + ": " + event.title : event.title
		const titleColor = (typeof event._config.eventTitleColor != 'undefined') ? event._config.eventTitleColor : this._config.eventTitleColor
		if (this._config.disableEventLink || (event.link === null)) return html`
		<div class="event-title" style="color: ${titleColor}">${titletext}</div>
		`
		else return html`
		<a href="${event.link}" style="text-decoration: none;" target="${this._config.linkTarget}">
		<div class="event-title" style="color: ${titleColor}">${titletext}</div></a>
		`
	}
	getCalTitleHTML(event) {
		const titleColor = (typeof event._config.titleColor != 'undefined') ? event._config.titleColor : this._config.eventTitleColor
		//const titleColor = 'yellow'
		if (this._config.disableCalEventLink || (event.htmlLink === null)) return html`
		${event.summary}
		`
		else return html`
		<a href="${event.htmlLink}" style="text-decoration: none;color: ${titleColor}" target="${this._config.linkTarget}">${event.summary}</a>
		`
	}

	/**
	 * generate Hours HTML
	 *
	 */
	getHoursHTML(event) {
		const today = moment()
		if (event.isEmpty) return html`<div>&nbsp;</div>`
		// full day events, no hours set
		// 1. One day only, or multiple day ends today -> 'All day'
		if (event.isFullOneDayEvent || (event.isFullMoreDaysEvent && moment(event.endTime).isSame(today, 'day')))
			return html`<div>${this._config.fullDayEventText}</div>`
		// 2. Starts any day, ends later -> 'All day, end date'
		else if (event.isFullMoreDaysEvent)
			return html`<div>${this._config.fullDayEventText}, ${this._config.untilText.toLowerCase()} ${this.getCurrDayAndMonth(moment(event.endTime))}</div>`
		// 3. starts before today, ends after today -> 'date - date'
		else if (event.isFullMoreDaysEvent && (moment(event.startTime).isBefore(today, 'day') || moment(event.endTime).isAfter(today, 'day')))
			return html`<div>${this._config.fullDayEventText}, ${this._config.untilText.toLowerCase()} ${this.getCurrDayAndMonth(moment(event.endTime))}</div>`
		// events with hours set
		//4. long term event, ends later -> 'until date'
		else if (moment(event.startTime).isBefore(today, 'day') && moment(event.endTime).isAfter(today, 'day'))
			return html`<div>${this._config.untilText} ${this.getCurrDayAndMonth(moment(event.endTime))}</div>`
		//5. long term event, ends today -> 'until hour'
		else if (moment(event.startTime).isBefore(today, 'day') && moment(event.endTime).isSame(today, 'day'))
			return html`<div>${this._config.untilText} ${event.endTime.format('LT')}</div>`
		//6. starts today or later, ends later -> 'hour - until date'
		else if (!moment(event.startTime).isBefore(today, 'day') && moment(event.endTime).isAfter(event.startTime, 'day'))
			return html`<div>${event.startTime.format('LT')}, ${this._config.untilText.toLowerCase()} ${this.getCurrDayAndMonth(moment(event.endTime))}</div>`
		// 7. Normal one day event, with time set -> 'hour - hour'
		else return html`
				<div>${event.startTime.format('LT')} - ${event.endTime.format('LT')}</div>`
	}

	/**
	 * generate Event Location link HTML
	 *
	 */
	getLocationHTML(event) {

		if (!event.location || !this._config.showLocation) return html``
		else if (this._config.disableLocationLink) return html`
		<div><ha-icon class="event-location-icon" icon="mdi:map-marker"></ha-icon>&nbsp;${event.address}</div>
		`
		else return html`
			<div><a href="https://maps.google.com/?q=${event.location}" target="${this._config.linkTarget}" class="location-link"><ha-icon class="event-location-icon" icon="mdi:map-marker"></ha-icon>&nbsp;${event.address}</a></div>
		`
	}
	getCalLocationHTML(event) {

		if (!event.location || !this._config.showLocation || this._config.disableCalLocationLink) return html``
		else return html`
			<a href="https://maps.google.com/?q=${event.location}" target="${this._config.linkTarget}" class="location-link"><ha-icon class="event-location-icon" icon="mdi:map-marker"></ha-icon>&nbsp;</a>
		`
	}

	/**
	 * update Events main HTML
	 *
	 */
	updateEventsHTML(days) {
		var htmlDays = ''

		if (!days) { // TODO some more tests end error message
			this.content = html`${this.errorMessage}`
			return
		}

		// TODO write something if no events
		if (days.length == 0) {
			this.content = this._config.noEventsForNextDaysText
			return
		}


		// move today's finished events up
		if (moment(days[0][0]).isSame(moment(), "day") && days[0].length > 1) {
			var i = 1
			while (i < days[0].length) {
				if (days[0][i].isEventFinished && !days[0][i - 1].isEventFinished) {
					[days[0][i], days[0][i - 1]] = [days[0][i - 1], days[0][i]]
					if (i > 1) i--
				} else
					i++
			}
		}

		// check if no events for today and push a "no events" fake event
		if (this._config.showNoEventsForToday && moment(days[0][0].startTime).isAfter(moment(), "day") && days[0].length > 0) {
			var emptyEv = {
				eventClass: '',
				config: '',
				start: { dateTime: moment().endOf('day') },
				end: { dateTime: moment().endOf('day') },
				summary: this._config.noEventsForTodayText,
				isFinished: false,
				htmlLink: 'https://calendar.google.com/calendar/r/day?sf=true'
			};
			var emptyEvent = new EventClass(emptyEv, '')
			emptyEvent.isEmpty = true
			var d = []
			d[0] = emptyEvent
			days.unshift(d)
		}

		//loop through days
		htmlDays = days.map((day, di) => {

			//loop through events for each day
			const htmlEvents = day.map((event, i, arr) => {
				const dayWrap = (i == 0 && di > 0) ? 'daywrap' : ''
				const isEventNext = (di == 0 && moment(event.startTime).isAfter(moment()) && (i == 0 || !moment(arr[i - 1].startTime).isAfter(moment()))) ? true : false
				//show line before next event
				const currentEventLine = (this._config.showCurrentEventLine &&
					isEventNext) ? html`<div class="eventBar"><ha-icon icon="mdi:circle" class="event-circle" style="color: ${this._config.eventBarColor};"></ha-icon><hr class="event"/></div>` : ``

				//show calendar name
				const eventCalName = (event._config.eventCalName) ? html`<div class="event-cal-name"><ha-icon icon="mdi:calendar" class="event-cal-name-icon"></ha-icon>&nbsp;${event._config.eventCalName}</div>` : ``

				//show current event progress bar
				var progressBar = ``
				if (di == 0 && ((event.isEventRunning && this._config.showFullDayProgress && event.isFullDayEvent) || (event.isEventRunning && !event.isFullDayEvent && this._config.showProgressBar))) {
					let eventDuration = event.endTime.diff(event.startTime, 'minutes');
					let eventProgress = moment().diff(event.startTime, 'minutes');
					let eventPercentProgress = ((eventProgress * 100) / eventDuration) / 100;
					progressBar = html`<mwc-linear-progress class="progress-bar"  determinate progress="${eventPercentProgress}" buffer="1"></mwc-linear-progress>`
				}

				var finishedEventsStyle = (event.isEventFinished && this._config.dimFinishedEvents) ? `opacity: ` + this._config.finishedEventOpacity + `; filter: ` + this._config.finishedEventFilter + `;` : ``

				const hoursHTML = this._config.showHours ? html`<div style="color: ${this._config.timeColor}; font-size: ${this._config.timeSize}%;">${this.getHoursHTML(event)}</div>` : ''
				const descHTML = this._config.showDescription ? html`<div class="event-description" style="color: ${this._config.descColor};font-size: ${this._config.descSize}%;">${event.description}</div>` : ''

				const lastEventStyle = i == arr.length - 1 ? 'padding-bottom: 8px;' : ''
				return html`

					<tr class="${dayWrap}" style="color: ${this._config.dayWrapperLineColor};">
						<td class="event-left" style="color: ${this._config.dateColor};font-size: ${this._config.dateSize}%;">
								<div>${(i === 0 && this._config.showMonth) ? event.startTimeToShow.format('MMM') : ''}</div>
								<div>${i === 0 ? event.startTimeToShow.format('DD') : ''}</div>
								<div>${(i === 0 && this._config.showWeekDay) ? event.startTimeToShow.format('ddd') : ''}</div>
						</td>
						<td style="width: 100%; ${finishedEventsStyle} ${lastEventStyle}">
							<div>${currentEventLine}</div>
							<div class="event-right">
								<div class="event-main" >
									${this.getTitleHTML(event)}
									${hoursHTML}
								</div>
								<div class="event-location">
									${this.getLocationHTML(event)}
									${eventCalName}
								</div>
							</div>
							<div class="event-right">
								<div class="event-main" >
									${descHTML}
								</div>
							</div>
							${progressBar}
						</td>

					</tr>`
			})

			return htmlEvents
		})
		this.content = html`<table><tbody>${htmlDays}</tbody></table>`
	}


	/**
	 * ready-to-use function to remove year from moment format('LL')
	 * @param {moment}
	 * @return {String} [month, day]
	 */

	getCurrDayAndMonth(locale) {
		const today = locale.format('LL');
		return today
			.replace(locale.format('YYYY'), '') // remove year
			.replace(/\s\s+/g, ' ') // remove double spaces, if any
			.trim() // remove spaces from the start and the end
			.replace(/[??]\./, '') // remove year letter from RU/UK locales
			.replace(/de$/, '') // remove year prefix from PT
			.replace(/b\.$/, '') // remove year prefix from SE
			.trim() // remove spaces from the start and the end
			.replace(/,$/g, ''); // remove comma from the end
	}

	/**
	 * check if string contains one of keywords
	 * @param {string} string to check inside
	 * @param {string} comma delimited keywords
	 * @return {bool}
	 */
	checkFilter(str, filter) {
		if (typeof filter != 'undefined' && filter != '') {
			const keywords = filter.split(',')
			return (keywords.some((keyword) => {
				if (RegExp('(?:^|\\s)' + keyword.trim(), 'i').test(str))
					return true
				else return false
			}))
		} else return false
	}

	/**
	 * check if event was declined
	 * @param {event} event data
	 * @return {bool} Returns true if the event was declined
	 */
	checkDeclined(event) {
		if(!event.attendees) { return false }
		if(!event.attendees.length > 0) { return false }
		return !!event.attendees.find(a => a.self == true && a.responseStatus == "declined")
	}

	/**
	 * gets events from HA Calendar to Events mode
	 *
	 */
	async getEvents() {

		let timeOffset = -moment().utcOffset()
		let start = moment().add(this._config.startDaysAhead, 'days').startOf('day').add(timeOffset, 'minutes').format('YYYY-MM-DDTHH:mm:ss');
		let end = moment().add((this._config.maxDaysToShow + this._config.startDaysAhead), 'days').endOf('day').add(timeOffset, 'minutes').format('YYYY-MM-DDTHH:mm:ss');

		let calendarUrlList = []
		this._config.entities.map(entity => {
			calendarUrlList.push([`calendars/${entity.entity}?start=${start}Z&end=${end}Z`])
		})
		try {
			return await (Promise.all(calendarUrlList.map(url =>
				this.hass.callApi('get', url[0]))).then((result) => {
					let singleEvents = []
					let eventCount = 0
					result.map((calendar, i) => {
						calendar.map((singleEvent) => {
							let blacklist = typeof this._config.entities[i]["blacklist"] != 'undefined' ? this._config.entities[i]["blacklist"] : ''
							let whitelist = typeof this._config.entities[i]["whitelist"] != 'undefined' ? this._config.entities[i]["whitelist"] : ''
							let singleAPIEvent = new EventClass(singleEvent, this._config.entities[i])
							if (
								(this._config.maxEventCount === 0 || eventCount < this._config.maxEventCount)
								&&
								(blacklist == '' || !this.checkFilter(singleEvent.summary, blacklist))
								&&
								(whitelist == '' || this.checkFilter(singleEvent.summary, whitelist))
								&&
								(this._config.showDeclined || !this.checkDeclined(singleEvent))
								&&
								((this._config.maxDaysToShow === 0 && singleAPIEvent.isEventRunning) || !(this._config.hideFinishedEvents && singleAPIEvent.isEventFinished))
							) {
								singleEvents.push(singleAPIEvent);
								eventCount++;
							}
						})
					})

					if (this._config.sortByStartTime) {
						singleEvents.sort(function (a, b) {
							return moment(a.startTime).diff(moment(b.startTime));
						})
					}
					let ev = [].concat.apply([], singleEvents)
					// grouping events by days, returns object with days and events
					const groupsOfEvents = ev.reduce(function (r, a) {
						r[a.daysToSort] = r[a.daysToSort] || []
						r[a.daysToSort].push(a);
						return r
					}, {})

					const days = Object.keys(groupsOfEvents).map(function (k) {
						return groupsOfEvents[k];
					});
					this.showLoader = false
					return days
				}))
		} catch (error) {
			this.showLoader = false
			throw error
		}
	}

	/**
	 * gets events from HA to Calendar mode
	 *
	 */
	getCalendarEvents(startDay, endDay, monthToGet, month) {
		this.refreshCalEvents = false
		let timeOffset = new Date().getTimezoneOffset()
		let start = moment(startDay).startOf('day').add(timeOffset, 'minutes').format('YYYY-MM-DDTHH:mm:ss');
		let end = moment(endDay).endOf('day').add(timeOffset, 'minutes').format('YYYY-MM-DDTHH:mm:ss');
		// calendarUrlList[url, type of event configured for this callendar,filters]
		let calendarUrlList = []
		this._config.entities.map(entity => {
			if (typeof entity.type != 'undefined') {
				calendarUrlList.push([
					`calendars/${entity.entity}?start=${start}Z&end=${end}Z`, entity.type,
					typeof entity.blacklist != 'undefined' ? entity.blacklist : '',
					typeof entity.whitelist != 'undefined' ? entity.whitelist : '',
					typeof entity.color != 'undefined' ? entity.color : this._config.defaultCalColor
				])
			}
		})
		Promise.all(calendarUrlList.map(url =>
			this.hass.callApi('get', url[0]))).then((result) => {
				if (monthToGet == this.monthToGet)
					result.map((eventsArray, i) => {
						month.map(m => {
							const calendarTypes = calendarUrlList[i][1]
							const calendarUrl = calendarUrlList[i][0]
							const calendarBlacklist = (typeof calendarUrlList[i][2] != 'undefined') ? calendarUrlList[i][2] : ''
							const calendarWhitelist = (typeof calendarUrlList[i][3] != 'undefined') ? calendarUrlList[i][3] : ''
							const calendarColor = (typeof calendarUrlList[i][4] != 'undefined') ? calendarUrlList[i][4] : this._config.defaultCalColor
							var filteredEvents = eventsArray.filter((event) => {
								const startTime = event.start.dateTime ? moment(event.start.dateTime) : moment(event.start.date).startOf('day')
								const endTime = event.end.dateTime ? moment(event.end.dateTime) : moment(event.end.date).subtract(1, 'days').endOf('day')
								if (
									!moment(startTime).isAfter(m.date, 'day')
									&&
									!moment(endTime).isBefore(m.date, 'day')
									&&
									calendarTypes
									&&
									(this._config.showDeclined || !this.checkDeclined(event))
									&&
									!this.checkFilter(event.summary, calendarBlacklist)
								)
									return event
							})
							var filteredEvents = filteredEvents.map((event) => {
								(!event.start.dateTime && !event.end.dateTime) ? event['isFullDayEvent'] = true : event['isFullDayEvent'] = false
								const endTime = event.end.dateTime ? moment(event.end.dateTime) : moment(event.end.date)
								moment(endTime).isBefore(moment()) ? event['isEventFinished'] = true : event['isEventFinished'] = false
								event['_config'] = { "color": calendarColor, "titleColor": this._config.eventTitleColor }
								return m['allEvents'].push(event)
							})
							eventsArray.map((event) => {
								const startTime = event.start.dateTime ? moment(event.start.dateTime) : moment(event.start.date).startOf('day')
								const endTime = event.end.dateTime ? moment(event.end.dateTime) : moment(event.end.date).subtract(1, 'days').endOf('day')
								if (!moment(startTime).isAfter(m.date, 'day') && !moment(endTime).isBefore(m.date, 'day') && calendarTypes && !this.checkFilter(event.summary, calendarBlacklist))
									//checking for calendar type (icons) and keywords
									try {
										if (this.checkFilter('icon1', calendarTypes)) {
											if (!this._config.calEventIcon1Filter || this.checkFilter(event.summary, this._config.calEventIcon1Filter))
												m['icon1'].push(event.summary)
										}
										if (this.checkFilter('icon2', calendarTypes)) {
											if (!this._config.calEventIcon2Filter || this.checkFilter(event.summary, this._config.calEventIcon2Filter))
												m['icon2'].push(event.summary)
										}
										if (this.checkFilter('icon3', calendarTypes)) {
											if (!this._config.calEventIcon3Filter || this.checkFilter(event.summary, this._config.calEventIcon3Filter))
												m['icon3'].push(event.summary)

										}
										if (this.checkFilter('holiday', calendarTypes)) {
											m['holiday'].push(event.summary)
										}
									} catch (e) {
										console.log('error: ', e, calendarUrl)
									}

							})

						})
						return month
					})
				if (monthToGet == this.monthToGet) this.showLoader = false
				this.refreshCalEvents = false
				this.requestUpdate()
			}).catch((err) => {
				this.refreshCalEvents = false
				console.log('error: ', err)
				this.showLoader = false
			})


	}


	/**
	 * create array for 42 calendar days
	 * showLastCalendarWeek
	 */
	buildCalendar(selectedMonth) {
		const firstDay = moment(selectedMonth).startOf('month')
		const dayOfWeekNumber = firstDay.day()
		this.month = [];
		let weekShift = 0;
		(dayOfWeekNumber - this._config.firstDayOfWeek) >= 0 ? weekShift = 0 : weekShift = 7
		for (var i = this._config.firstDayOfWeek - dayOfWeekNumber - weekShift; i < 42 - dayOfWeekNumber + this._config.firstDayOfWeek - weekShift; i++) {
			this.month.push(new CalendarDay(moment(firstDay).add(i, 'days'), i))
		}
	}

	/**
	 * change month in calendar mode
	 *
	 */
	handleMonthChange(i) {
		this.selectedMonth = moment(this.selectedMonth).add(i, 'months');
		this.monthToGet = this.selectedMonth.format("M");
		this.eventSummary = html`&nbsp;`;
		this.refreshCalEvents = true;
	}

  /**
   * Make HTML summary for the given day
   */
  daySummaryHTML(day) {
		let events = ([','].concat.apply([], [day.holiday, day.daybackground, day.icon1, day.icon2, day.icon3]))
		this.clickedDate = day.date;
		day._allEvents.sort(function (a, b) {
			const leftStartTime = a.start.dateTime ? moment(a.start.dateTime) : moment(a.start.date).startOf('day')
			const rightStartTime = b.start.dateTime ? moment(b.start.dateTime) : moment(b.start.date).startOf('day')
			return moment(leftStartTime).diff(moment(rightStartTime))
		})

    return day._allEvents.map((event, i, arr) => {
			const titleColor = (typeof event._config.titleColor != 'undefined') ? event._config.titleColor : this._config.eventTitleColor
			const calColor = (typeof event._config.color != 'undefined') ? event._config.color : this._config.defaultCalColor
			var finishedEventsStyle = (event.isEventFinished && this._config.dimFinishedEvents) ? `opacity: ` + this._config.finishedEventOpacity + `; filter: ` + this._config.finishedEventFilter + `;` : ``
			if (event.isFullDayEvent) {
				return html`
					<div class="summary-fullday-div" style="border-color: ${calColor}; ${finishedEventsStyle}">
						<span aria-hidden="true">
							<span class="bullet-event-span">${this.getCalTitleHTML(event)} ${this.getCalLocationHTML(event)}</span>
						</span>
					</div>`
			} else {
				const StartTime = this._config.showHours ? moment(event.start.dateTime).format('LT') : ''
				return html`
					<div class="summary-event-div" style="${finishedEventsStyle}">
						<div class="bullet-event-div" style="border-color: ${calColor}"></div>
						<span class="bullet-event-span" style="color: ${titleColor};">${StartTime} - ${this.getCalTitleHTML(event)} ${this.getCalLocationHTML(event)}</span>
					</div > `
			}
		})
  }

	/**
	 * show events summary under the calendar
	 *
	 */
	handleEventSummary(day) {
		this.eventSummary = this.daySummaryHTML(day);

		this.requestUpdate()
	}

	/**
	 * create html calendar header
	 *
	 */
	getCalendarHeaderHTML() {
		return html`
			<div class="calDateSelector">
				<ha-icon-button class="ha-icon-button" icon="mdi:chevron-left" @click='${e => this.handleMonthChange(-1)}' title = "left" ></ha-icon-button>
				<a href="https://calendar.google.com/calendar/r/month/${moment(this.selectedMonth).format('YYYY')}/${moment(this.selectedMonth).format('MM')}/1" style="text-decoration: none; color: ${this._config.calDateColor}; position: relative; top: 4px;" target="${this._config.linkTarget}">
					${moment(this.selectedMonth).locale(this.language).format('MMMM')}  ${moment(this.selectedMonth).format('YYYY')}
				</a>
				<ha-icon-button class="ha-icon-button" icon="mdi:chevron-right" @click='${e => this.handleMonthChange(1)}' title = "right" ></ha-icon-button>
			</div >`
	}

	/**
	 * create html cells for all days of calendar
	 *
	 */
	getCalendarDaysHTML(month) {
		var showLastRow = true
		if (!this._config.showLastCalendarWeek && !moment(month[35].date).isSame(this.selectedMonth, 'month')) showLastRow = false

		return month.map((day, i) => {
			const dayStyleOtherMonth = moment(day.date).isSame(moment(this.selectedMonth), 'month') ? '' : `opacity: .35;`
			const dayStyleToday = moment(day.date).isSame(moment(), 'day') ? `background-color: ${this._config.calEventBackgroundColor};` : ``
			const dayHolidayStyle = (day.holiday && day.holiday.length > 0) ? `color: ${this._config.calEventHolidayColor};` : ``
			const dayStyleSat = (moment(day.date).isoWeekday() == 6) ? `background-color: ${this._config.calEventSatColor};` : ``
			const dayStyleSun = (moment(day.date).isoWeekday() == 7) ? `background-color: ${this._config.calEventSunColor};` : ``
			const dayStyleClicked = moment(day.date).isSame(moment(this.clickedDate), 'day') ? `background-color: ${this._config.calActiveEventBackgroundColor};` : ``
			const dayIcon1 = (day.icon1 && day.icon1.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon1Color};" icon="${this._config.calEventIcon1}"></ha-icon></span>` : ''
			const dayIcon2 = (day.icon2 && day.icon2.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon2Color};" icon="${this._config.calEventIcon2}"></ha-icon></span>` : ''
			const dayIcon3 = (day.icon3 && day.icon3.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon3Color};" icon="${this._config.calEventIcon3}"></ha-icon></span>` : ''

			if (i < 35 || showLastRow)
				return html`
					${ i % 7 === 0 ? html`<tr class="cal">` : ''}
					<td @click='${(e) => this.handleEventSummary(day)}' class="cal" style="color: ${this._config.calDayColor};${dayStyleOtherMonth}${dayStyleToday}${dayHolidayStyle}${dayStyleSat}${dayStyleSun}${dayStyleClicked}">
						<div class="calDay">
							<div style="position: relative; top: 5%; ">
								${(day.dayNumber).replace(/^0|[^/]0./, '')}
							</div>
							<div>
								${dayIcon1} ${dayIcon2} ${dayIcon3}
							</div>
						</div>
					</td>
					${i && (i % 6 === 0) ? html`</tr>` : ''}
					`
		})

	}

	/**
	 * update Calendar mode HTML
	 *
	 */
	updateCalendarHTML() {
		if (this.month.length == 0 || this.refreshCalEvents || moment().diff(this.lastCalendarUpdateTime, 'minutes') > 120) {
			this.lastCalendarUpdateTime = moment()
			this.showLoader = true
			this.buildCalendar(this.selectedMonth)
			this.getCalendarEvents(this.month[0].date, this.month[41].date, this.monthToGet, this.month)
			this.showLoader = false
		}
    const month = this.month;
		var weekDays = moment.weekdaysMin(true);

		const htmlDayNames = weekDays.map((day) => html`
						<th class="cal" style = "padding-bottom: 8px; color:  ${this._config.calWeekDayColor};" > ${day}</th> `)

		this.content = html`
							<div class="calTitleContainer">
								${ this.getCalendarHeaderHTML()}
			</div >
						<div class="calTableContainer">
							<table class="cal" style="color: ${this._config.eventTitleColor};">
								<thead>  <tr>
									${htmlDayNames}
								</tr>  </thead>
								<tbody>
									${this.getCalendarDaysHTML(month)}
								</tbody>
							</table>
						</div>
						<div style="font-size: 90%;">
							${this.eventSummary}
						</div>
			`
	}

	/**
	 * create html cells for all days of calendar
	 *
	 */
	getTwoWeekHTML(month) {
		return month.map((day, i) => {
			const dayStyleOtherMonth = moment(day.date).isSame(moment(this.selectedMonth), 'month') ? '' : `opacity: .35;`
			const dayStyleToday = moment(day.date).isSame(moment(), 'day') ? `background-color: ${this._config.calEventBackgroundColor};` : ``
			const dayHolidayStyle = (day.holiday && day.holiday.length > 0) ? `color: ${this._config.calEventHolidayColor};` : ``
			const dayStyleSat = (moment(day.date).isoWeekday() == 6) ? `background-color: ${this._config.calEventSatColor};` : ``
			const dayStyleSun = (moment(day.date).isoWeekday() == 7) ? `background-color: ${this._config.calEventSunColor};` : ``
			const dayStyleClicked = moment(day.date).isSame(moment(this.clickedDate), 'day') ? `background-color: ${this._config.calActiveEventBackgroundColor};` : ``
			const dayIcon1 = (day.icon1 && day.icon1.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon1Color};" icon="${this._config.calEventIcon1}"></ha-icon></span>` : ''
			const dayIcon2 = (day.icon2 && day.icon2.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon2Color};" icon="${this._config.calEventIcon2}"></ha-icon></span>` : ''
			const dayIcon3 = (day.icon3 && day.icon3.length > 0) ? html`<span><ha-icon class="calIcon" style="color: ${this._config.calEventIcon3Color};" icon="${this._config.calEventIcon3}"></ha-icon></span>` : ''

			return html`
				${ i % 7 === 0 ? html`<tr class="week">` : ''}
				<td class="week" style="color: ${this._config.calDayColor};${dayStyleOtherMonth}${dayStyleToday}${dayHolidayStyle}${dayStyleSat}${dayStyleSun}${dayStyleClicked}">
					<div class="weekDay">
						<div style="position: relative; top: 5%; ">
							${(day.dayNumber).replace(/^0|[^/]0./, '')}
						</div>
						<div>
              ${this.daySummaryHTML(day)}
						</div>
					</div>
				</td>
				${i && (i % 6 === 0) ? html`</tr>` : ''}
				`
		})

	}
	/**
	 * update Two-week mode HTML
	 *
	 */
	updateTwoWeekHTML() {

		if (this.days.length == 0 || this.refreshCalEvents || moment().diff(this.lastCalendarUpdateTime, 'minutes') > 120) {
			this.lastCalendarUpdateTime = moment()
			this.showLoader = true
		  const firstDay = moment().weekday(0);
      this.days = [];
		  for (var i = 0; i < 14; i++) {
			  this.days.push(new CalendarDay(moment(firstDay).add(i, 'days'), i))
		  }
			this.getCalendarEvents(this.days[0].date, this.days[13].date, this.monthToGet, this.days)
			this.showLoader = false
		}
    const days = this.days;
		var weekDays = moment.weekdaysMin(true)

		const htmlDayNames = weekDays.map((day) => html`
						<th class="week" style = "padding-bottom: 8px; color:  ${this._config.calWeekDayColor};" > ${day}</th> `)

		this.content = html`
							<div class="calTitleContainer">
								${ this.getCalendarHeaderHTML()}
			</div >
						<div class="calTableContainer">
							<table class="week" style="color: ${this._config.eventTitleColor};">
								<thead>  <tr>
									${htmlDayNames}
								</tr>  </thead>
								<tbody>
									${this.getTwoWeekHTML(days)}
								</tbody>
							</table>
						</div>
			`
	}
}

customElements.define('atomic-calendar-revive', AtomicCalendarRevive);


/**
 * class for 42 calendar days
 *
 */
class CalendarDay {
	constructor(calendarDay, d) {
		this.calendarDay = calendarDay
		this._lp = d;
		this.ymd = moment(calendarDay).format("YYYY-MM-DD")
		this._holiday = [];
		this._icon1 = [];
		this._icon2 = [];
		this._icon3 = [];
		this._allEvents = [];
		this._daybackground = [];
	}

	get date() {
		return moment(this.calendarDay)
	}

	get dayNumber() {
		return moment(this.calendarDay).format("DD")
	}

	get monthNumber() {
		return moment(this.calendarDay).month()
	}

	set holiday(eventName) {
		this._holiday = eventName;
	}

	get holiday() {
		return this._holiday;

	}

	set icon1(eventName) {
		this._icon1 = eventName;
	}

	get icon1() {
		return this._icon1;
	}

	set icon2(eventName) {
		this._icon2 = eventName;
	}

	get icon2() {
		return this._icon2;
	}
	set allEvents(events) {
		this._allEvents = events;
	}

	get allEvents() {
		return this._allEvents;
	}

	set icon3(eventName) {
		this._icon3 = eventName;
	}

	get icon3() {
		return this._icon3;
	}

	set daybackground(eventName) {
		this._daybackground = eventName;
	}

	get daybackground() {
		return this._daybackground;
	}
}

/**
 * class for Events in events mode
 *
 */

class EventClass {
	constructor(eventClass, config) {
		this.eventClass = eventClass;
		this._config = config;
		this._startTime = this.eventClass.start.dateTime ? moment(this.eventClass.start.dateTime) : moment(this.eventClass.start.date).startOf('day')
		this._endTime = this.eventClass.end.dateTime ? moment(this.eventClass.end.dateTime) : moment(this.eventClass.end.date).subtract(1, 'days').endOf('day')
		this.isFinished = false;
		this.isEmpty = false;
	}

	get titleColor() {
		if (this._config.eventTitleColor)
			return this._config.eventTitleColor;
		else return 'var(--primary-text-color)';
	}

	get title() {
		return this.eventClass.summary
	}

	get description() {
		return this.eventClass.description
	}

	//true start time
	get startTime() {
		return this._startTime
	}

	//start time, returns today if before today
	get startTimeToShow() {
		var time = this.eventClass.start.dateTime ? moment(this.eventClass.start.dateTime) : moment(this.eventClass.start.date).startOf('day')
		if (moment(time).isBefore(moment().startOf('day')))
			return moment().startOf('day')
		else return time
	}

	get endTime() {
		return this._endTime
	}

	// is full day event
	get isFullDayEvent() {
		if (!this.eventClass.start.dateTime && !this.eventClass.end.dateTime)
			return true
		else return false
	}
	// is full day event, but only one day
	get isFullOneDayEvent() {
		if ((!this.eventClass.start.dateTime && !this.eventClass.end.dateTime && moment(this.eventClass.start.date).isSame(moment(this.eventClass.end.date).subtract(1, 'days'), 'day')) || (
			moment(this.eventClass.start.dateTime).isSame(moment(this.eventClass.start.dateTime).startOf('day')) && moment(this.eventClass.end.dateTime).isSame(moment(this.eventClass.end.dateTime).startOf('day')) && moment(this.eventClass.start.dateTime).isSame(moment(this.eventClass.end.dateTime).subtract(1, 'days'), 'day')

		))
			return true
		else return false
	}

	// is full day event, more days
	get isFullMoreDaysEvent() {
		if ((!this.eventClass.start.dateTime && !this.eventClass.end.dateTime && !moment(this.eventClass.start.date).isSame(moment(this.eventClass.end.date).subtract(1, 'days'), 'day')) || (
			moment(this.eventClass.start.dateTime).isSame(moment(this.eventClass.start.dateTime).startOf('day')) && moment(this.eventClass.end.dateTime).isSame(moment(this.eventClass.end.dateTime).startOf('day')) && moment(this.eventClass.end.dateTime).isAfter(moment(this.eventClass.start.dateTime).subtract(1, 'days'), 'day')
		))
			return true
		else return false
	}

	// return YYYYMMDD for sorting
	get daysToSort() {
		return moment(this.startTimeToShow).format('YYYYMMDD');
	}

	get isEventRunning() {
		return (moment(this.startTime).isBefore(moment()) && moment(this.endTime).isAfter(moment()))
	}

	get isEventFinished() {
		return (moment(this.endTime).isBefore(moment()))
	}

	get location() {
		return this.eventClass.location ? (this.eventClass.location).split(' ').join('+') : '';
	}

	get address() {
		return this.eventClass.location ? this.eventClass.location.split(',')[0] : ''
	}

	get link() {
		return this.eventClass.htmlLink
	}
}
