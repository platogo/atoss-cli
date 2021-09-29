(ns atoss-cli.atoss-test
  (:require [clojure.test :refer [is testing]]
            [atoss-cli.atoss :refer [->Day fmt-row]]))

(def day (->Day "14.09" "Mi" "" "VGZ" "V" "wh" "09:00" "k" "18:00" "k" "8:30" "0:48" ""))

(testing "fmt-row of a normal Day"
  (is (= (fmt-row day)
         "14.09 |  Mi |      | VGZ |  V |  wh | 09:00 | k | 18:00 | k |  8:30 |  0:48 |      ")))
