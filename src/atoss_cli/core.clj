(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require [atoss-cli.atoss :as atoss]
            [atoss-cli.cli :as cli]
            [atoss-cli.config :as config]
            [atoss-cli.macos :as macos]
            [clojure.java.shell :as sh]
            [clojure.term.colors :refer [green red]]
            [clojure.tools.cli :refer [parse-opts]]
            [progress.indeterminate :as pi])
  (:import (java.util Collection))
  (:gen-class))


(def mac-chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

(defn -maybe-inject-mac-chrome-path
  "Inject the path to the Chrome binary on macOS if the current OS is macOS."
  [opts]
  (if (macos/is-mac?)
    (assoc opts :path-browser mac-chrome-path)
    opts))

(defn log-time-single
  "Log a time pair for a given date."
  [{opts :options}]
  (when (macos/is-mac?)
    (let [chromedriver-path (-> (sh/sh "which" "chromedriver")
                                :out
                                .trim)]
      (macos/remove-quarantine-attr chromedriver-path)
      (macos/add-spctl-label chromedriver-path)))
  (let [driver (atoss/setup-driver (-maybe-inject-mac-chrome-path {:headless true}))
        config (config/load-in)
        session-opts (merge opts config)]
    (try
      (println (green "Logging time..."))
      (pi/animate!
       (doto driver
         (atoss/login session-opts)
         (atoss/nav-to-time-correction)
         (atoss/create-time-pair-entry session-opts)
         (atoss/logout session-opts)
         (atoss/end))
       (pi/print
        (green "Logged time for date: " (:date opts)))
       (shutdown-agents))

      (catch Exception e
        (-> e
            (.getMessage)
            (red)
            (println))
        (atoss/end driver)))))

(defn web
  "Open in web browser."
  []
  (let [config (config/load-in)]
    (atoss/browse config)))

(defn -config-cmd [args]
  (let [[_cmd subcmd k v] args]
    (cond
      (= subcmd "init") (config/init)
      (= subcmd "set") (config/set-val (keyword k) v)
      :else (println "Unknown config command"))))

(defn -log-cmd [{options :options :as opts}]
  (cond
    (options :file) (println (red "File logging no longer supported."))
    :else (log-time-single opts)))

(defn -main [& args]
  (let [{^Collection arguments :arguments
         summary :summary,
         options :options,
         :as opts} (parse-opts args cli/options)
        [cmd _subcmd] arguments]
    (cond
      (options :version) (cli/print-project-ver)
      (options :help) (cli/print-help summary)
      (= cmd "log") (-log-cmd opts)
      (= cmd "web") (web)
      (= cmd "config") (-config-cmd arguments)
      :else (cli/print-help summary))
    (flush)))
