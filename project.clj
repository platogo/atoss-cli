(defproject atoss-cli "0.1.0-SNAPSHOT"
  :description "A CLI tool for interacting with ATOSS time sheets"
  :url "http://example.com/FIXME"
  :license {:name "EPL-2.0 OR GPL-2.0-or-later WITH Classpath-exception-2.0"
            :url "https://www.eclipse.org/legal/epl-2.0/"}
  :main ^:skip-aot atoss-cli.core
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.10.1"]
                 [etaoin "0.4.5"]
                 [org.clojure/tools.cli "1.0.206"]]

  :repl-options {:init-ns atoss-cli.core})
