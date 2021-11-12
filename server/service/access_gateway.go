package service

import (
	"next-terminal/server/global/gateway"
	"next-terminal/server/log"
	"next-terminal/server/model"
	"next-terminal/server/repository"
	"next-terminal/server/term"
)

type AccessGatewayService struct {
	accessGatewayRepository *repository.AccessGatewayRepository
}

func NewAccessGatewayService(accessGatewayRepository *repository.AccessGatewayRepository) *AccessGatewayService {
	accessGatewayService = &AccessGatewayService{accessGatewayRepository: accessGatewayRepository}
	return accessGatewayService
}

func (r AccessGatewayService) GetGatewayAndReconnectById(accessGatewayId string) (g *gateway.Gateway, err error) {
	g = gateway.GlobalGatewayManager.GetById(accessGatewayId)
	if g == nil || !g.Connected {
		accessGateway, err := r.accessGatewayRepository.FindById(accessGatewayId)
		if err != nil {
			return nil, err
		}
		g = r.ReConnect(&accessGateway)
	}
	return g, nil
}

func (r AccessGatewayService) GetGatewayById(accessGatewayId string) (g *gateway.Gateway, err error) {
	g = gateway.GlobalGatewayManager.GetById(accessGatewayId)
	return g, nil
}

func (r AccessGatewayService) ReConnectAll() error {
	gateways, err := r.accessGatewayRepository.FindAll()
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

func (r AccessGatewayService) ReConnect(m *model.AccessGateway) *gateway.Gateway {
	log.Debugf("重建接入网关「%v」中...", m.Name)
	r.DisconnectById(m.ID)
	sshClient, err := term.NewSshClient(m.IP, m.Port, m.Username, m.Password, m.PrivateKey, m.Passphrase)
	var g *gateway.Gateway
	if err != nil {
		g = gateway.NewGateway(m.ID, m.Localhost, false, err.Error(), nil)
	} else {
		g = gateway.NewGateway(m.ID, m.Localhost, true, "", sshClient)
	}
	gateway.GlobalGatewayManager.Add <- g
	log.Debugf("重建接入网关「%v」完成", m.Name)
	return g
}

func (r AccessGatewayService) DisconnectById(accessGatewayId string) {
	gateway.GlobalGatewayManager.Del <- accessGatewayId
}
