package repository

import (
	"context"

	"next-terminal/server/model"
)

var (
	LoginPolicyUserRefRepository = new(loginPolicyUserRefRepository)
	TimePeriodRepository         = new(timePeriodRepository)
)

type loginPolicyUserRefRepository struct {
	baseRepository
}

func (r loginPolicyUserRefRepository) Create(c context.Context, m *model.LoginPolicyUserRef) error {
	return r.GetDB(c).Create(m).Error
}

func (r loginPolicyUserRefRepository) CreateInBatches(c context.Context, m []model.LoginPolicyUserRef) error {
	return r.GetDB(c).CreateInBatches(m, 100).Error
}

func (r loginPolicyUserRefRepository) DeleteByUserId(c context.Context, userId string) error {
	return r.GetDB(c).Where("user_id = ?", userId).Delete(model.LoginPolicyUserRef{}).Error
}

func (r loginPolicyUserRefRepository) FindByUserId(c context.Context, userId string) (items []model.LoginPolicyUserRef, err error) {
	err = r.GetDB(c).Where("user_id = ?", userId).Find(&items).Error
	return
}

func (r loginPolicyUserRefRepository) FindByLoginPolicyId(c context.Context, loginPolicyId string) (items []model.LoginPolicyUserRef, err error) {
	err = r.GetDB(c).Where("login_policy_id = ?", loginPolicyId).Find(&items).Error
	return
}

func (r loginPolicyUserRefRepository) DeleteByLoginPolicyId(c context.Context, loginPolicyId string) error {
	return r.GetDB(c).Where("login_policy_id = ?", loginPolicyId).Delete(model.LoginPolicyUserRef{}).Error
}

func (r loginPolicyUserRefRepository) DeleteByLoginPolicyIdAndUserId(c context.Context, loginPolicyId, userId string) error {
	return r.GetDB(c).Where("login_policy_id = ? and user_id = ?", loginPolicyId, userId).Delete(model.LoginPolicyUserRef{}).Error
}

func (r loginPolicyUserRefRepository) DeleteId(c context.Context, id string) error {
	return r.GetDB(c).Where("id = ?", id).Delete(model.LoginPolicyUserRef{}).Error
}

type timePeriodRepository struct {
	baseRepository
}

func (r timePeriodRepository) CreateInBatches(c context.Context, m []model.TimePeriod) error {
	return r.GetDB(c).CreateInBatches(m, 7).Error
}

func (r timePeriodRepository) DeleteByLoginPolicyId(c context.Context, loginPolicyId string) error {
	return r.GetDB(c).Where("login_policy_id = ?", loginPolicyId).Delete(model.TimePeriod{}).Error
}

func (r timePeriodRepository) FindByLoginPolicyId(c context.Context, loginPolicyId string) (items []model.TimePeriod, err error) {
	err = r.GetDB(c).Where("login_policy_id = ?", loginPolicyId).Find(&items).Error
	return
}
