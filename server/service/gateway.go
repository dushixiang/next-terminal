package service

import (
	"context"

	"next-terminal/server/global/gateway"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/term"
)

type gatewayService struct{}

func (r gatewayService) GetGatewayAndReconnectById(accessGatewayId string) (g *gateway.Gateway, err error) {
	g = gateway.GlobalGatewayManager.GetById(accessGatewayId)
	if g == nil || !g.Connected {
		accessGateway, err := repository.GatewayRepository.FindById(context.TODO(), accessGatewayId)
		if err != nil {
			return nil, err
		}
		g = r.ReConnect(&accessGateway)
	}
	return g, nil
}

func (r gatewayService) GetGatewayById(accessGatewayId string) (g *gateway.Gateway, err error) {
	g = gateway.GlobalGatewayManager.GetById(accessGatewayId)
	if g == nil {
		accessGateway, err := repository.GatewayRepository.FindById(context.TODO(), accessGatewayId)
		if err != nil {
			return nil, err
		}
		g = r.ReConnect(&accessGateway)
	}
	return g, nil
}

func (r gatewayService) ReConnectAll() error {
	gateways, err := repository.GatewayRepository.FindAll(context.TODO())
	if err != nil {
		return err
	}
	if len(gateways) > 0 {
		for i := range gateways {
			r.ReConnect(&gateways[i])
		}
	}

	return nil
}

func (r gatewayService) ReConnect(m *model.AccessGateway) *gateway.Gateway {
	log.Debugf("重建接入网关「%v」中...", m.Name)
	r.DisconnectById(m.ID)
	sshClient, err := term.NewSshClient(m.IP, m.Port, m.Username, m.Password, m.PrivateKey, m.Passphrase)
	var g *gateway.Gateway
	if err != nil {
		g = gateway.NewGateway(m.ID, false, err.Error(), nil)
	} else {
		g = gateway.NewGateway(m.ID, true, "", sshClient)
	}
	gateway.GlobalGatewayManager.Add <- g
	log.Debugf("重建接入网关「%v」完成", m.Name)
	return g
}

func (r gatewayService) DisconnectById(accessGatewayId string) {
	gateway.GlobalGatewayManager.Del <- accessGatewayId
}
