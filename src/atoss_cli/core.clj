(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require
   [clojure.java.io :as io]
   [clojure.data.csv :as csv]
   [clojure.tools.cli :refer [parse-opts]]
   [clojure.term.colors :refer [green red]]
   [progress.indeterminate :as pi]
   [atoss-cli.atoss :as atoss]
   [atoss-cli.config :as config]
   [atoss-cli.cli :as cli])
  (:import (java.util Collection))
  (:gen-class))


(def mac-chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

(defn -maybe-inject-mac-chrome-path
  "Inject the path to the Chrome binary on macOS if the current OS is macOS."
  [opts]
  (let [os-name (System/getProperty "os.name")]
    (if (re-find #"Mac OS X" os-name)
      (assoc opts :path-browser mac-chrome-path)
      opts)))

(defn parse-time-pair-file
  "Parse a CSV file containing time pairs and return a seq of maps."
  [file-path]
  (let [lines (-> file-path
                  io/reader
                  csv/read-csv)]
    (try (->> lines
              (filter #(> (count %) 1))
              (map #(let [[date start-time end-time day-code] %]
                      {:date date
                       :start-time start-time
                       :end-time end-time
                       :day-code day-code}))
              (doall))
         (catch Exception e
           (println (red "Error parsing time pair file: " (.getMessage e)))
           (shutdown-agents)))))

(defn log-time-single
  "Log a time pair for a given date."
  [{opts :options}]
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

(defn log-time-col
  "Log a collection of time pairs."
  [{opts :options}]
  (let [driver (atoss/setup-driver (-maybe-inject-mac-chrome-path {:headless true}))
        config (config/load-in)
        session-opts (merge opts config)
        {file :file} opts
        time-pairs (parse-time-pair-file file)]
    (try
      (println (green "Logging time from file " file))
      (pi/animate!
       (doto driver
         (atoss/login session-opts)
         (atoss/nav-to-time-correction)
         (atoss/create-time-pair-entries time-pairs)
         (atoss/logout session-opts)
         (atoss/end))
       (pi/print
        (green "Logged time from file " file))
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
    (options :file) (log-time-col opts)
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
