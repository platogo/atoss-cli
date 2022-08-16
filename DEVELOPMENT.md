# Development guide

## Environment

For **development**, you will need:

- [Java](https://openjdk.org)
- [Clojure](https://clojure.org/guides/getting_started)
- [Leiningen](https://leiningen.org)
- [ChromeDriver](https://chromedriver.chromium.org) + Google Chrome

The easiest way to install Java and Clojure is using [ASDF](https://asdf-vm.com) and running

```bash
asdf install
```

from the root of the project.

## Tools

I recommend using a combination of Emacs, [Clojure-LSP](https://clojure-lsp.io) and [CIDER](https://docs.cider.mx/cider/index.html).

Another alternative is using [Visual Studio Code](https://code.visualstudio.com) and [Calva](https://calva.io).

## Useful commands

Fetch deps with `lein deps`

Compile the project with `lein compile`

Run using `lein run` or with an interactive REPL: `lein repl`

Run all tests using `lein test`

## Build

Simply run

```bash

lein uberjar

```

This will build a fully self-contained JAR, ready to be run anywhere.

## Tips

It is very useful to interactively create a driver instance using the Lein REPL or CIDER / Calva jack-in, and then step through the driver steps by evaluating forms (functions) that act on the driver instance.

In some pages, it is easier to simply send multiple keyboard `TAB` inputs to select the wanted input, rather than rely on complex selectors. We use this strategy a lot in the time pair entry form.
