package service

import (
	"context"

	"next-terminal/server/global/gateway"
	"next-terminal/server/model"
	"next-terminal/server/repository"
)

var GatewayService = new(gatewayService)

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
	r.DisconnectById(m.ID)
	g := gateway.GlobalGatewayManager.Add(m)
	return g
}

func (r gatewayService) DisconnectById(id string) {
	gateway.GlobalGatewayManager.Del(id)
}
