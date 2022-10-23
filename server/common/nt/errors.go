package nt

import "errors"

var (
	ErrNameAlreadyUsed  = errors.New("name already used")
	ErrPermissionDenied = errors.New("permission denied")
)
