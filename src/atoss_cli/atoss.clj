(ns atoss-cli.atoss
  "Functions related to interacting with ATOSS via WebDriver."
  (:require
   [clojure.edn :as edn]
   [etaoin.api :as api]
   [etaoin.keys :as keys])
  (:gen-class))

(def valid-day-codes #{"du" "nu" "rt" "sd" "ta" "th" "tp" "ts" "wh" "" nil})

(def atoss-url "https://ases.novomatic.com/SES/html")

(def login-btn {:css ".btn-login"})
(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def month-overview-btn {:css "div.z-panelchildren > div.z-atossbutton:nth-of-type(1)"})
(def zeitkorr-btn {:css "div.z-panelchildren > div.z-atossbutton:nth-of-type(4)"})
(def logout-btn {:css ".z-logoutbutton"})

(def update-btn {:css ".z-toolbarbutton:nth-of-type(1)"})
(def date-input {:css ".z-datebox-input"})

(defprotocol TimeSheetDay
  (fmt-row [day]))

(defrecord Day [date
                day-of-week
                comment
                work-pattern
                booking-code
                day-code
                start-time
                start-time-correctness
                end-time
                end-time-correctness
                time-logged
                saldo
                overtime]
  TimeSheetDay (fmt-row
                 [day]
                 (apply format "%5s | %3s | %4s | %3s | %2s | %3s | %5s | %1s | %5s | %1s | %5s | %5s | %5s" (vals day))))

(defn -max-row-cnt
  [driver]
  (-> driver
      (api/query-tree {:css "div.slick-cell.l1.r1 > span"})
      count))

;; Used to build a dynamic selector of the correct cell in the month overview table.
;; For example, row indexing starts with 1, with the first day being 3rd row
;; Columns indexing starts with 0, with the first col being the date

;; Monatsubersich columns

;; l0 - date
;; l1 - day of the week
;; l2 - comment
;; l3 - Arbeitsmuster
;; l4 - internal status code (V - vacation, A! - unlogged day)
;; l5 - day code (e.g. wh, empty etc.)
;; l6 - start time
;; l7 - st correctness
;; l8 - end time
;; l9 - et correctness
;; l10 - time logged per day
;; l11 - saldo
;; l12 - overtime

(defn -cell-selector
  [row col]
  {:css (format "div.ui-widget-content.slick-row:nth-child(%d) > div.slick-cell.l%d.r%d > span" row col col)})

;; Public API

(defn setup-driver
  "Create a default driver instance to be used for interacting with ATOSS. Headless by default."
  ([] (setup-driver true))
  ([headless?]
   (let [driver (api/chrome {:headless headless?})]
     (api/set-window-size driver 1200 800)
     driver)))

(defn login
  "Login into ATOSS dashboard using provided credentials."
  [driver {user :username pass :password}]
  (println "Logging into ATOSS with user: " (subs user 3) "***")
  (doto driver
    (api/go atoss-url)
    (api/switch-frame :applicationIframe)
    (api/wait-enabled login-btn)
    (api/wait 2)
    (api/fill-active user)
    (api/fill-active keys/tab)
    (api/fill-active pass)
    (api/fill-active keys/enter))
  (println "Logged in"))

(defn logout
  [driver]
  (println "Logging out of ATOSS")
  (doto driver
    (api/click nav-user-btn)
    (api/click logout-btn)))

(defn end
  [driver]
  (api/quit driver))

(defn nav-to-time-correction
  "Navigate the driver to the time correction page.
  This is where all of the data entry must happen."
  [driver]
  (doto driver
    (api/wait 2)
    (api/wait-visible nav-menu-btn)
    (api/click nav-menu-btn)
    (api/wait-visible zeitkorr-btn)
    (api/click zeitkorr-btn)
    (api/wait-visible {:tag :span :fn/has-text "Tagescode"})))

(defn nav-to-month-overview
  "Navigate the driver to the current month overview.
  This is where every time pair can be parsed."
  [driver]
  (doto driver
    (api/wait-visible nav-menu-btn)
    (api/click nav-menu-btn)
    (api/wait-visible month-overview-btn)
    (api/click month-overview-btn)
    (api/wait-visible {:css "div.slick-row"})))

(defn set-date
  "Sets the day of the month in time correction that the time pair will be applied to."
  [driver date]
  (doto driver
    (api/wait-visible date-input)
    (api/click date-input)
    (api/wait 1)
    (api/fill-active date)
    (api/wait 2)
    (api/click update-btn)
    (api/wait 1)))

(defn create-time-pair-entry
  "Create a new time entry as a combination of day code and a time pair for a given day."
  [driver {day-code :day-code start :start-time end :end-time}]
  (println (if (nil? day-code)
             "No day code provided"
             (str "Day code: " day-code)))
  (api/click driver date-input)
  (dotimes [_i 4]
    (api/fill-active driver keys/tab))
  (api/wait driver 3) ;; Do not touch waiters - if it is any less, the UI will not have enough time to update
  (doto driver
    (api/fill-active (if (nil? day-code) " " day-code))
    (api/fill-active keys/tab)
    (api/wait 2)
    (api/fill-active start)
    (api/fill-active keys/tab)
    (api/wait 2)
    (api/fill-active end)
    (api/fill-active keys/enter)
    (api/wait 2)))

(defn parse-month-table-rows
  "Parse day records from month overview. Returns a collection of Days."
  [driver]
  (let [first-row 3
        last-row (- (-max-row-cnt driver) 3)
        rows (range first-row last-row)]
    (for [row rows]
      (let [col-vals (for [col (range 0 13)]
                       (api/get-element-inner-html driver (-cell-selector row col)))
            day (apply ->Day col-vals)]
        day))))

(defn creds-from-dotfile
  "Returns atoss credentials from dotfile in home directory."
  []
  (let [dotfile-name ".atoss"
        dotfile-path (str (System/getProperty "user.home") "/" dotfile-name)]
    (try
      (-> dotfile-path (slurp) (edn/read-string))
      (catch Exception _e (println "Failed to read credentials, make sure .atoss file exists!")))))
