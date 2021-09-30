(ns atoss-cli.core
  "Entrypoint module for the ATOSS CLI."
  (:require [clojure.tools.cli :refer [parse-opts]]
            [atoss-cli.atoss :as atoss])
  (:import (java.util Date Collection) [java.text SimpleDateFormat])
  (:gen-class))

(def today-date (.format
                 (SimpleDateFormat. "dd.MM.yyyy")
                 (new Date)))

(def desc "ATOSS CLI by Platogo Interactive Entertainment Gmbh.
Work seamlessly with ATOSS time sheets.")

(def help-header "
\033[1;37mUSAGE
  atoss-cli <command> [args]

\033[1;37mCOMMANDS
  log:       Log time pair for today or a specific date
  view:      View month overview of logged time")

(def cli-options
  ;; An option with a required argument
  [["-d" "--date DATE" "Date in the format DD.MM.YYYY"
    :default today-date] ;; FIXME: Add validation
   ["-c" "--day-code CODE" "Valid ATOSS day code (e.g. wh for WFH) can also be left blank."
    :default nil
    :validate [#(contains? atoss/valid-day-codes %) "Must be a valid ATOSS time code."]]
   ["-s" "--start-time TIME" "Work start time in the format HH:MM"
    :default "9:00"]
   ["-e" "--end-time TIME" "Work end time in the format HH:MM"
    :default "17:00"]
   ;; A non-idempotent option (:default is applied first)
   ["-v" nil "Verbosity level"
    :id :verbosity
    :default 0
    :update-fn inc]
   ;; A boolean option defaulting to nil
   ["-h" "--help" "Show this help printout."
    :default false]])

(defn -print-help
  [args-summary]
  (print desc)
  (newline)
  (print help-header)
  (newline)
  (newline)
  (print args-summary))

(defn log-time
  "Log a time pair for a given day."
  [{opts :options}]
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)
        {date :date} opts]
    (doto driver
      (atoss/login creds)
      (atoss/nav-to-time-correction)
      (atoss/set-date date)
      (atoss/create-time-pair-entry opts)
      (atoss/logout)
      (atoss/end))
    (println "Logged time")))

(defn show-month-overview
  "Display the current month overview in the terminal."
  []
  (let [driver (atoss/setup-driver)
        creds (atoss/creds-from-dotfile)]
    (doto driver
      (atoss/login creds)
      (atoss/nav-to-month-overview))
    (let [days (atoss/parse-month-table-rows driver)]
      (println "\033[1;37mMonth overview:")
      (newline)
      (doseq [day days]
        (-> day
            (atoss/fmt-row)
            (println))))))

(defn -main [& args]
  (let [{^Collection arguments :arguments
         summary :summary,
         options :options,
         :as opts} (parse-opts args cli-options)]
    (cond
      (options :help) (-print-help summary)
      (= (first arguments) "view") (show-month-overview)
      (= (first arguments) "log") (log-time opts)
      :else (-print-help summary))
    (flush)))
