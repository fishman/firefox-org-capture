JPM = jpm
NAME=$(shell grep name package.json | sed 's/.*: "\(.*\)",/\1/' | head -n1)
VERSION=$(shell grep version package.json | sed 's/.*: "\(.*\)",/\1/')
XPI=$(NAME)-$(VERSION).xpi

WEBSITE=www/
ORG=README.org

all: xpi README

run:
	$(JPM) run

xpi: $(XPI)

$(XPI): package.json $(wildcard lib/*) $(wildcard data/*)
	$(JPM) xpi
	mv $(NAME).xpi $(XPI)

README: README.txt
	mv $< $@

%.txt: %.org
	emacs -q --batch --visit=$< --funcall org-ascii-export-to-ascii

%.html: %.org
	emacs -q --batch --visit=$< --funcall org-html-export-to-html

index.html: README.html
	mv $< $@

publish: xpi index.html
	chmod a+r index.html *.xpi
	rsync -aP index.html *.xpi $(WEBSITE)
	rm index.html

clean:
	rm -f $(XPI)

