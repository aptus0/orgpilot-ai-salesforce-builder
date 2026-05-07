ThisBuild / scalaVersion := "3.5.2"
ThisBuild / organization := "com.orgpilot"
ThisBuild / version := "0.1.0"

lazy val root = (project in file("."))
  .settings(
    name := "orgpilot-scala-llm-service"
  )
