{{/*
Copyright VMware, Inc.
SPDX-License-Identifier: APACHE-2.0
*/}}

{{- define "next-terminal.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}



{{- define "next-terminal.mysql.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-mysql-headless" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- /*
 define the next-terminal release namespace
*/ -}}
{{- define "release_namespace" -}}
{{- if .Values.namespaceOverride -}}
{{- .Values.namespaceOverride -}}
{{- else -}}
{{- .Release.Namespace -}}
{{- end -}}
{{- end -}}

{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "next-terminal.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{- /*
next-terminal.labels generates the standard Helm labels.
*/ -}}
{{- define "next-terminal.labels" -}}
app.kubernetes.io/name: {{ template "next-terminal.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion }}
{{- end -}}


{{- define "next-terminal.imagePullSecrets" -}}
{{- include "common.images.renderPullSecrets" (dict "images" (list .Values.image) "context" $) -}}
{{- end -}}


{{- define "next-terminal.guacd.fullname" -}}
{{- printf "%s-%s" (include "common.names.fullname" .) "guacd" | trunc 63 | trimSuffix "-" -}}
{{- end -}}


{{- define "next-terminal.web.fullname" -}}
{{- printf "%s-%s" (include "common.names.fullname" .) "web" | trunc 63 | trimSuffix "-" -}}
{{- end -}}



{{- define "next-terminal.web.sshd.secretName" -}}
{{- if .Values.web.sshd.existingSecret -}}
    {{- .Values.web.sshd.existingSecret -}}
{{- else }}
    {{- include "next-terminal.web.fullname" .  -}}
{{- end -}}
{{- end -}}



{{- define "next-terminal.pvc" -}}
{{- .Values.nfs.existingClaim | default (include "common.names.fullname" .) -}}
{{- end -}}