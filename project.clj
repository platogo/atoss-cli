(defproject atoss-cli "0.1.2-SNAPSHOT"
  :description "A CLI tool for interacting with ATOSS time sheets"
  :url "https://github.com/platogo/atoss-cli"
  :license {:name "EPL-2.0 OR GPL-2.0-or-later WITH Classpath-exception-2.0"
            :url "https://www.eclipse.org/legal/epl-2.0/"}
  :main ^:skip-aot atoss-cli.core
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.10.1"]
                 [etaoin "0.4.5"]
                 [org.clojure/tools.cli "1.0.206"]]
  :native-image {:name "atoss-native"
                 :opts ["--report-unsupported-elements-at-runtime" ;; ignore native-image build errors
                        "-H:+ReportExceptionStackTraces"
                        "--allow-incomplete-classpath"
                        "--no-server"
                        "--no-fallback"
                        "--initialize-at-run-time=org.apache.http.impl.auth.NTLMEngineImpl"
                        "--initialize-at-run-time=clojure.core.server,clojure.lang"
                        "--initialize-at-build-time=clojure.spec.gen.alpha,clojure,clojure.core.server"
                        "--enable-url-protocols=http,https"
                        ]}
  :target-path "target/%s"
  :jar-name "atoss-cli.jar"
  :uberjar-name "atoss-cli-standalone.jar"

  :global-vars {*warn-on-reflection* true}

  :profiles {:uberjar {:aot :all
                       :native-image {:jvm-opts ["-Dclojure.compiler.direct-linking=true"]}}
             }
  :plugins [[lein-cljfmt "0.8.0"]
            [io.taylorwood/lein-native-image "0.3.1"]]
  :jvm-opts ["-Dclojure.compiler.direct-linking=true"]
  :repl-options {:init-ns atoss-cli.core})
