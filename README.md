# About

[![Clojure CI](https://github.com/platogo/atoss-cli/actions/workflows/clojure.yml/badge.svg)](https://github.com/platogo/atoss-cli/actions/workflows/clojure.yml)

A Clojure CLI tool designed to interact with ATOSS. 

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-refresh-toc -->
**Table of Contents**

- [About](#about)
    - [Usage](#usage)
        - [Prerequisite](#prerequisite)
        - [Requirements](#requirements)
        - [Installation](#installation)
            - [Automatic](#automatic)
            - [Manually](#manually)
        - [Updating](#updating)
    - [Development](#development)
    - [Roadmap](#roadmap)
    - [Troubleshooting](#troubleshooting)
        - [Chromedriver does not start](#chromedriver-does-not-start)
        - [View command fails](#view-command-fails)
    - [License](#license)

<!-- markdown-toc end -->

## Usage

To log time for the current day from `9:30` to `18:00`:

```bash
atoss-cli log -s 9:30 -e 18:00
```

You can also specify a day code (e.g. `wh` for a Work From Home (WFH) day):

```bash
atoss-cli log -c wh -e "17:30"
```

If you are unsure about available day codes, you can always check ATOSS manually.

To view the full list of options, call `atoss-cli -h`

### Prerequisite

Create a text file named `.atoss` in your home directory (e.g. `~/.atoss`).

The file should be written in [EDN](https://github.com/edn-format/edn) with the following contents (your ATOSS username and password):

```edn
{:username "1234567", :password "blablabla"}
```

### Requirements

- `Java Runtime Environment` (at least version 8), I recommend using [Jabba](https://github.com/shyiko/jabba) or Homebrew (`brew install openjdk`)
- Up to date `chromedriver`. Download it manually from the [official page](https://chromedriver.chromium.org/downloads) for your operating system, or install it using your package manager (e.g. `brew install chromedriver`)
- Google Chrome (up to date) or Chromium

If you are on macOS, this is as easy as `brew install chromedriver openjdk`

### Installation

#### Automatic

Clone this repository and run [install.sh](./install.sh).

If you did not build the uberjar locally, you must have the [Github CLI](https://cli.github.com) installed.

#### Manually

Download the latest release JAR from [Release](https://github.com/platogo/atoss-cli/releases) and save it somewhere. Then simply run it:

```bash
java -jar atoss-cli-standalone.jar -h
```

### Updating

Simply run `./install.sh` again, and the latest release should be installed automatically.

## Development

Check out [DEVELOPMENT.md](./DEVELOPMENT.md)

## Roadmap

  - [x] Improve help menu
  - [ ] Build native binary with [GraalVM Native Image](https://www.graalvm.org/reference-manual/native-image/)
  - [ ] Automated time sheet export and upload for submission
  - [ ] Multiple time pairs for a single day support
  - [ ] Windows support
  
## Troubleshooting

### Chromedriver does not start

This is a fairly common issue due to the security model of macOS. It is likely that after an update of `chromedriver`, it needs to be explicitly granted permissions again.

After it tries to launch, make sure to press `Allow` in `System Preferences > Security & Privacy`

![security](./security.png)

### View command fails

This is an issue with ATOSS remembering the time range you have selected in Monthly Overview.

If you run `atoss-cli view`, the day range should match the current month. This will be fixed in a future update.

## License

Copyright © 2021 Daniils Petrovs @ Platogo Interactive Entertainment Gmbh.

This program and the accompanying materials are made available under the
terms of the Eclipse Public License 2.0 which is available at
http://www.eclipse.org/legal/epl-2.0.

This Source Code may also be made available under the following Secondary
Licenses when the conditions for such availability set forth in the Eclipse
Public License, v. 2.0 are satisfied: GNU General Public License as published by
the Free Software Foundation, either version 2 of the License, or (at your
option) any later version, with the GNU Classpath Exception which is available
at https://www.gnu.org/software/classpath/license.html.
