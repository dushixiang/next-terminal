package sets

func NewStringSet() *Set {
	return &Set{data: make(map[string]struct{})}
}

type Set struct {
	data map[string]struct{}
}

func (s *Set) Add(key ...string) {
	for _, k := range key {
		s.data[k] = struct{}{}
	}
}

func (s *Set) Remove(key ...string) {
	for _, k := range key {
		delete(s.data, k)
	}
}

func (s *Set) Contains(key string) bool {
	_, ok := s.data[key]
	return ok
}

func (s *Set) ToArray() []string {
	var keys []string
	for key, _ := range s.data {
		keys = append(keys, key)
	}
	return keys
}
