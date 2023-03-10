{{/* Returns the app name */}}
{{- define "app.name" -}}
{{- default .Release.Name .Values.nameOverride -}}
{{- end }}