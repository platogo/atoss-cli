# About

A Clojure CLI tool designed to interact with ATOSS. 

## Usage

### Prerequisite

Log into ATOSS once in German mode, and mark **Zeitkorrektung** in the nav menu as favorite. This needs to only be done once.

![zeitkorrektung](./zeitkorrektung.png)


Create a file called `.atoss` in your home directory (e.g. `~/.atoss`).

The file should be written in [EDN](https://github.com/edn-format/edn) with the following content:

```edn
{:username "1234567", :password "blablabla"}
```

```bash

java -jar target/uberjar/atoss-cli-standalone.jar -s "9:15" -e "16:45" -d "16.09.2021"

ATOSS CLI by Platogo Interactive Entertainment Gmbh.
Authors: Daniils Petrovs
  -c, --day-code CODE    nil         Valid ATOSS day code (e.g. wh for WFH) can also be left blank.
  -s, --start-time TIME  9:00        Work start time in the format HH:MM
  -e, --end-time TIME    17:00       Work end time in the format HH:MM
  -v                                 Verbosity level
  -h, --help, :errors nil}
```

For example, if you were working from home on `17.09.2021` from `9:00` to `17:30`:

```bash
java -jar target/uberjar/atoss-cli-standalone.jar -c wh -e "17:30" -d "17.09.2021"
```

If you are unsure about available day codes, you can always check ATOSS manually.

### Requirements

- `Java Runtime Environment` (at least version 8), I recommend using [Jabba](https://github.com/shyiko/jabba)
- Up to date `chromedriver` and Google Chrome. Download it manually from the [official page](https://chromedriver.chromium.org/downloads) for your operating system, or install it using your package manager

For development, you will need:

- [Clojure](https://clojure.org/guides/getting_started)
- [Leiningen](https://leiningen.org)

I strongly recommend using a combination of Emacs, [Clojure-LSP](https://clojure-lsp.io) and [CIDER](https://docs.cider.mx/cider/index.html).

Fetch deps with `lein deps`

Compile the project with `lein compile`

Run using `lein run` or with an interactive REPL: `lein repl`

Run all tests using `lein test`

### Build

Simply run

```bash

lein uberjar

```

This will build a fully self-contained JAR, ready to be run anywhere.

## License

Copyright © 2021 Daniils Petrovs Platogo Interactive Entertainment Gmbh.

This program and the accompanying materials are made available under the
terms of the Eclipse Public License 2.0 which is available at
http://www.eclipse.org/legal/epl-2.0.

This Source Code may also be made available under the following Secondary
Licenses when the conditions for such availability set forth in the Eclipse
Public License, v. 2.0 are satisfied: GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or (at your
option) any later version, with the GNU Classpath Exception which is available
at https://www.gnu.org/software/classpath/license.html.
