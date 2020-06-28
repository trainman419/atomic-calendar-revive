all: dist/atomic-calendar-revive-editor.js dist/atomic-calendar-revive.js

clean:
	rm -f dist/atomic-calendar-revive-editor.js dist/app-editor.js dist/atomic-calendar-revive.js dist/app.js

install: dist/atomic-calendar-revive-editor.js dist/atomic-calendar-revive.js
	cp dist/atomic-calendar-revive-editor.js dist/atomic-calendar-revive.js ../www/community/atomic-calendar-revive/

dist/atomic-calendar-revive-editor.js: dist/app-editor.js
	cp $< $@

dist/atomic-calendar-revive.js: dist/app.js
	sed 's/app-editor.js/atomic-calendar-revive-editor.js/g' < $< > $@

dist/app.js dist/app-editor.js: src/app.js src/app-editor.js package.json rollup.config.js
	npm run build
