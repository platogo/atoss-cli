(ns atoss-cli.atoss
  (:require [etaoin.api :as api]
            [etaoin.keys :as keys])
  (:gen-class))

(def atoss-url "https://ases.novomatic.com/SES/html")
(def workday {:def-start-time "9:00"
              :def-end-time "17:30"})

(def nav-menu-btn {:css "#nav_menu"})
(def nav-user-btn {:css "#nav_user"})

(def fav-btn {:css ".is-favorite"})
(def logout-btn {:css ".z-logoutbutton"})

(def date-input {:css ".z-datebox-input"})
(def date-box {:css ".z-datebox-button"})

(defn- date-calendar-cell-btn
  [driver date]
  (api/query-tree driver {:fn/has-classes [:z-calendar-weekday :z-calendar-cell]
                          :fn/text date :index 1}))

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
  (doto driver
    (api/click date-box)
    (api/click (date-calendar-cell-btn driver date))))
