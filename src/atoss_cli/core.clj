(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require
   [clojure.tools.cli :refer [parse-opts]]
   [atoss-cli.atoss :as atoss]
   [atoss-cli.cli :as cli])
  (:import (java.util Collection))
  (:gen-class))

(defn log-time
  "Log a time pair for a given day."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)
        {date :date} opts]
    (try
      (doto driver
        (atoss/login creds)
        (atoss/nav-to-time-correction)
        (atoss/set-date date)
        (atoss/create-time-pair-entry opts)
        (atoss/logout)
        (atoss/end))
      (println "Logged time")
      (catch Exception e (println (.getMessage e))))))

;; FIXME: very brittle so disabled for now
(defn show-month-overview
  "Display the current month overview in the terminal."
  []
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)]
    (doto driver
      (atoss/login creds)
      (atoss/nav-to-month-overview))
    (let [days (atoss/parse-month-table-rows driver)]
      (println "\033[1;37mMonth overview:\u001b[0m")
      (newline)
      (doseq [day days]
        (-> day
            (atoss/fmt-row)
            (println))))))

(defn -main [& args]
  (let [{^Collection arguments :arguments
         summary :summary,
         options :options,
         :as opts} (parse-opts args cli/options)]
    (cond
      (options :version) (cli/print-project-ver)
      (options :help) (cli/print-help summary)
      (= (first arguments) "log") (log-time opts)
      :else (cli/print-help summary))
    (flush)))
