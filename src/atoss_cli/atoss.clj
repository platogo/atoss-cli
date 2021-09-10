(ns atoss-cli.atoss
  "Functions related to interacting with ATOSS via WebDriver."
  (:require [clojure.spec.alpha :as spec]
            [etaoin.api :as api]
            [etaoin.keys :as keys])
  (:gen-class))

(spec/def :day/code (spec/or
                     :code #{:du :nu :rt :sd :ta :th :tp :ts :wh}
                     :empty nil?))
(spec/def :calendar/date #(spec/int-in-range? 1 32 %))

(def atoss-url "https://ases.novomatic.com/SES/html")
(def workday {:def-start-time "9:00"
              :def-end-time "17:30"})

(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def fav-btn {:css ".is-favorite"})
(def logout-btn {:css ".z-logoutbutton"})

(def date-input {:css ".z-datebox-input"})
(def date-box {:css ".z-datebox-button"})

(def day-code-cell {:css "div.slick-cell > span.z-bandbox.z-bandboxases"})
(def day-code-input {:css ".z-bandbox-input.inTable"})

(defn- date-calendar-cell-btn
  [driver date]
  (api/query-tree driver {:fn/has-classes [:z-calendar-weekday :z-calendar-cell]
                          :fn/text date :index 1}))

(defn setup-driver
  "Create a default driver instance to be used for interacting with ATOSS."
  []
  (let [driver (api/chrome)]
    (api/set-window-size driver 1200 800)
    driver))

(defn login
  "Perform login into ATOSS dashboard using provided ATOSS credentials."
  [driver {user :username pass :password}]
  (println "Logging into ATOSS with user: " user)
  (doto driver
    (api/go atoss-url)
    (api/wait 3) ;; TODO: replace with proper waiter
    (api/fill-active user)
    (api/fill-active keys/tab)
    (api/fill-active pass)
    (api/fill-active keys/enter)))

(defn logout
  [driver]
  (println "Logging out of ATOSS")
  (doto driver
    (api/switch-frame :applicationIframe)
    (api/click nav-user-btn)
    (api/click logout-btn)))

(defn nav-to-time-correction
  "Navigate the driver to the time correction page.
  This is where all of the data entry must happen."
  [driver]
  (doto driver
    (api/switch-frame :applicationIframe)
    (api/click nav-menu-btn)
    (api/click fav-btn)
    (api/wait-visible {:tag :span :fn/has-text "Tagescode"})))

(defn set-date
  "Sets the day of the month in time correction that the time pair will be applied to."
  [driver date]
  (if (spec/valid? :calendar/date (Integer/parseInt date))
    (doto driver
      (api/click date-box)
      (api/click (date-calendar-cell-btn driver date)))
    (spec/explain :calendar/date (Integer/parseInt date))))

(defn create-time-pair-entry
  "Create a new time entry as a combination of day code and a time pair for a given day."
  [driver {day-code :day-code start :start-time end :end-time}]
  (if (spec/valid? :day/code day-code)
    (do
      (println (if (nil? day-code)
                 "No day code provided"
                 (str "Day code: " day-code)))
      (doto driver
        (api/click day-code-cell)
        (api/click day-code-input)
        (api/clear day-code-input))
      (doto driver
        (api/fill day-code-input (if (nil? day-code) "" (name day-code)))
        (api/fill day-code-input keys/tab)
        (api/fill-active start)
        (api/fill-active keys/tab)
        (api/fill-active end)
        (api/fill-active keys/enter)))
    (spec/explain :day/code day-code)))
