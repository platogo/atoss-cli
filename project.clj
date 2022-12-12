(defproject atoss-cli "0.3.5-SNAPSHOT"
  :description "A CLI tool for interacting with ATOSS time sheets"
  :url "https://github.com/platogo/atoss-cli"
  :license {:name "EPL-2.0 OR GPL-2.0-or-later WITH Classpath-exception-2.0"
            :url "https://www.eclipse.org/legal/epl-2.0/"}
  :main ^:skip-aot atoss-cli.core
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.11.1"]
                 [org.clojure/tools.cli "1.0.206"]
                 [etaoin "0.4.6"]
                 [com.github.pmonks/spinner "2.0.190"]
                 [clojure-term-colors "0.1.0"]
                 [com.github.clj-easy/graal-build-time "0.1.4"]]
  :target-path "target/%s"
  :jar-name "atoss-cli.jar"
  :uberjar-name "atoss-cli-standalone.jar"

  :global-vars {*warn-on-reflection* true}

  :profiles {:uberjar {:aot :all
                       :native-image {:jvm-opts ["-Dclojure.compiler.direct-linking=true"]}}}
  :plugins [[lein-cljfmt "0.8.0"]
            [cider/cider-nrepl "0.28.0"]]
  :jvm-opts ["-Dclojure.compiler.direct-linking=true"]
  :repl-options {:init-ns atoss-cli.core
                 :init (do (use 'etaoin.api) (require '[etaoin.keys :as keys]))})
