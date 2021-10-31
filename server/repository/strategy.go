package repository

import (
	"next-terminal/server/model"

	"gorm.io/gorm"
)

type StrategyRepository struct {
	DB *gorm.DB
}

func NewStrategyRepository(db *gorm.DB) *StrategyRepository {
	strategyRepository = &StrategyRepository{DB: db}
	return strategyRepository
}

func (r StrategyRepository) FindAll() (o []model.Strategy, err error) {
	err = r.DB.Order("name desc").Find(&o).Error
	return
}

func (r StrategyRepository) Find(pageIndex, pageSize int, name, order, field string) (o []model.Strategy, total int64, err error) {
	m := model.Strategy{}
	db := r.DB.Table(m.TableName())
	dbCounter := r.DB.Table(m.TableName())

	if len(name) > 0 {
		db = db.Where("name like ?", "%"+name+"%")
		dbCounter = dbCounter.Where("name like ?", "%"+name+"%")
	}

	err = dbCounter.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if order == "ascend" {
		order = "asc"
	} else {
		order = "desc"
	}

	if field == "name" {
		field = "name"
	} else {
		field = "created"
	}

	err = db.Order(field + " " + order).Find(&o).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Error
	if o == nil {
		o = make([]model.Strategy, 0)
	}
	return
}

func (r StrategyRepository) DeleteById(id string) error {
	return r.DB.Where("id = ?", id).Delete(model.Strategy{}).Error
}

func (r StrategyRepository) Create(m *model.Strategy) error {
	return r.DB.Create(m).Error
}

func (r StrategyRepository) UpdateById(o *model.Strategy, id string) error {
	o.ID = id
	return r.DB.Updates(o).Error
}

func (r StrategyRepository) FindById(id string) (m model.Strategy, err error) {
	err = r.DB.Where("id = ?", id).First(&m).Error
	return
}
