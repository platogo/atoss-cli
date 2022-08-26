(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require
   [clojure.tools.cli :refer [parse-opts]]
   [clojure.term.colors :refer [bold green red]]
   [atoss-cli.atoss :as atoss]
   [atoss-cli.config :as config]
   [atoss-cli.cli :as cli])
  (:import (java.util Collection))
  (:gen-class))

(defn log-time
  "Log a time pair for a given date."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        config (config/load-in)
        {date :date} opts
        session-opts (merge opts config)]
    (try
      (doto driver
        (atoss/login session-opts)
        (atoss/nav-to-time-correction)
        (atoss/set-date date)
        (atoss/create-time-pair-entry session-opts)
        (atoss/logout session-opts)
        (atoss/end))
      (println (green "Logged time for date: " date))
      (catch Exception e (println (red (.getMessage e)))))))

;; FIXME: very brittle so disabled for now
(defn show-month-overview
  "Display the current month overview in the terminal."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        config (config/load-in)]
    (doto driver
      (atoss/login (merge opts config))
      (atoss/nav-to-month-overview))
    (let [days (atoss/parse-month-table-rows driver)]
      (println (bold "Month overview:"))
      (newline)
      (doseq [day days]
        (-> day
            (atoss/fmt-row)
            (println))))))

(defn -main [& args]
  (let [{^Collection arguments :arguments
         summary :summary,
         options :options,
         :as opts} (parse-opts args cli/options)
        [cmd subcmd k v] arguments]
    (cond
      (options :version) (cli/print-project-ver)
      (options :help) (cli/print-help summary)
      (= cmd "log") (log-time opts)
      (and (= cmd "config") (= subcmd "init")) (config/init)
      (and (= cmd "config") (= subcmd "set")) (config/set-val (keyword k) v)
      :else (cli/print-help summary))
    (flush)))
