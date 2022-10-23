package taskrunner

import "sync"

type Runner struct {
	wg     sync.WaitGroup
	errors []error
	mux    sync.Mutex
}

func (r *Runner) Add(f func() error) {
	r.wg.Add(1)
	go func() {
		defer r.wg.Done()
		if err := f(); err != nil {
			r.addError(err)
		}
	}()
}

func (r *Runner) addError(err error) {
	r.mux.Lock()
	defer r.mux.Unlock()
	r.errors = append(r.errors, err)
}

func (r *Runner) Wait() []error {
	r.wg.Wait()
	return r.errors
}
