(ns atoss-cli.atoss
  "Functions related to interacting with ATOSS via WebDriver."
  (:require
   [clojure.java.browse :refer [browse-url]]
   [etaoin.api :as api]
   [etaoin.keys :as keys])
  (:gen-class))

(comment "Various ATOSS web interface selectors.")

(def valid-day-codes #{"du" "nu" "rt" "sd" "ta" "th" "tp" "ts" "wh" "" nil})

(def login-btn {:css ".btn-login"})
(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def month-overview-btn {:css "div.z-panelchildren > div.z-atossbutton:nth-of-type(1)"})
(def zeitkorr-btn {:css "div.z-panelchildren > div.z-atossbutton:nth-of-type(4)"})
(def logout-btn {:css ".z-logoutbutton"})

(def update-btn {:css ".z-toolbarbutton:nth-of-type(1)"})
(def date-input {:css ".z-datebox-input"})
(def timepair-table {:css "div.slick-pane.slick-pane-top.slick-pane-left > div.slick-viewport.slick-viewport-top.slick-viewport-left"})
(def time-pair-row {:css "div.slick-row"})
(def add-time-pair-btn {:css "ul.z-menupopup-content > li.z-menuitem > a.z-menuitem-content:first-of-type"})

(defn -max-row-cnt
  [driver]
  (-> driver
      (api/query-tree {:css "div.slick-cell.l1.r1 > span"})
      count))

;; Used to build a dynamic selector of the correct cell in the month overview table.
;; For example, row indexing starts with 1, with the first day being 3rd row
;; Columns indexing starts with 0, with the first col being the date

(defn -cell-selector
  [row col]
  {:css (format "div.ui-widget-content.slick-row:nth-child(%d) > div.slick-cell.l%d.r%d > span" row col col)})

;; Public API

(defn setup-driver
  "Create a default driver instance to be used for interacting with ATOSS. Headless by default."
  ([] (setup-driver {:headless true}))
  ([opts]
   (let [driver (api/chrome opts)]
     (api/set-window-size driver 1200 800)
     driver)))

(defn browse
  "Open Atoss in the default web browser."
  [{atoss-url :url}]
  (println "Opening Atoss in browser...")
  (browse-url atoss-url))

(defn login
  "Login into ATOSS dashboard."
  [driver {user :username pass :password
           verbosity :verbosity atoss-url :url}]
  (when (> verbosity 0)
    (println "Logging into ATOSS with user: " (subs user 3) "***"))
  (doto driver
    (api/go atoss-url)
    (api/switch-frame :applicationIframe)
    (api/wait-enabled login-btn)
    (api/wait 2)
    (api/fill-active user)
    (api/fill-active keys/tab)
    (api/fill-active pass)
    (api/fill-active keys/enter))

  (when (> verbosity 0)
    (println "Logged in")))

(defn logout
  [driver {verbosity :verbosity}]
  (when (> verbosity 0)
    (println "Logging out of ATOSS"))

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

(defn set-date
  "Sets the day of the month in time correction that the time pair will be applied to."
  [driver date]
  (doto driver
    (api/wait-visible date-input)
    (api/click date-input)
    (api/wait 1)
    (api/fill-active date)
    (api/fill-active keys/enter)
    (api/wait 2)
    (api/click date-input)
    (api/wait 1)))

(defn create-time-pair-entry
  "Create a new time entry as a combination of day code and a time pair for a given day."
  [driver {day-code :day-code
           start :start-time
           end :end-time
           date :date}]

  (set-date driver date)
  (dotimes [_i 4]
    (api/fill-active driver keys/tab))
  (api/wait driver 3) ;; Do not touch waiters - if it is any less, the UI will not have enough time to update
  (doto driver
    (api/fill-active day-code)
    (api/fill-active keys/tab)
    (api/wait 2)
    (api/fill-active start)
    (api/fill-active keys/tab)
    (api/wait 2)
    (api/fill-active end)
    (api/fill-active keys/enter)
    (api/wait 2)))

(defn create-time-pair-entries
  "Create time pair entries from a collection of time pairs."
  [driver time-pairs]
  (doseq [time-pair time-pairs]
    (println "Creating time pair entry for date: " (:date time-pair))
    (create-time-pair-entry driver time-pair)))
