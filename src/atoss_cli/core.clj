(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require
   [clojure.tools.cli :refer [parse-opts]]
   [clojure.term.colors :refer [bold green red]]
   [progress.indeterminate :as pi]
   [atoss-cli.atoss :as atoss]
   [atoss-cli.cli :as cli])
  (:import (java.util Collection))
  (:gen-class))

(defn log-time
  "Log a time pair for a given date."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)
        {date :date} opts]
    (try
      (println (green "Logging time..."))
      (pi/animate!
       (doto driver
         (atoss/login creds opts)
         (atoss/nav-to-time-correction)
         (atoss/set-date date)
         (atoss/create-time-pair-entry opts)
         (atoss/logout opts)
         (atoss/end))
       (pi/print (green "Logged time for date: " date))
       (shutdown-agents))

      (catch Exception e (-> e
                             (.getMessage)
                             (red)
                             (println))))))

;; FIXME: very brittle so disabled for now
(defn show-month-overview
  "Display the current month overview in the terminal."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)]
    (doto driver
      (atoss/login creds opts)
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
        command (first arguments)]
    (cond
      (options :version) (cli/print-project-ver)
      (options :help) (cli/print-help summary)
      (= command "log") (log-time opts)
      :else (cli/print-help summary))
    (flush)))
