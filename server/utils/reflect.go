package utils

import "reflect"

func GetName(repository interface{}) string {
	return reflect.TypeOf(repository).Elem().Name()
}
