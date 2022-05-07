package service

import (
	"context"

	"next-terminal/server/global/gateway"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
)

type gatewayService struct{}

func (r gatewayService) GetGatewayById(accessGatewayId string) (g *gateway.Gateway, err error) {
	g = gateway.GlobalGatewayManager.GetById(accessGatewayId)
	if g == nil {
		accessGateway, err := repository.GatewayRepository.FindById(context.TODO(), accessGatewayId)
		if err != nil {
			return nil, err
		}
		g = r.ReLoad(&accessGateway)
	}
	return g, nil
}

func (r gatewayService) LoadAll() error {
	gateways, err := repository.GatewayRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	if len(gateways) > 0 {
		for i := range gateways {
			r.ReLoad(&gateways[i])
		}
	}
	return nil
}

func (r gatewayService) ReLoad(m *model.AccessGateway) *gateway.Gateway {
	log.Debugf("重建接入网关「%v」中...", m.Name)
	r.DisconnectById(m.ID)
	g := gateway.GlobalGatewayManager.Add(m)
	log.Debugf("重建接入网关「%v」完成", m.Name)
	return g
}

func (r gatewayService) DisconnectById(id string) {
	gateway.GlobalGatewayManager.Del(id)
}
