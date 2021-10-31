package repository

/**
 * 定义了相关模型的持久化层，方便相互之间调用
 */
var (
	userRepository           *UserRepository
	userGroupRepository      *UserGroupRepository
	resourceSharerRepository *ResourceSharerRepository
	assetRepository          *AssetRepository
	credentialRepository     *CredentialRepository
	propertyRepository       *PropertyRepository
	commandRepository        *CommandRepository
	sessionRepository        *SessionRepository
	accessSecurityRepository *AccessSecurityRepository
	accessGatewayRepository  *AccessGatewayRepository
	jobRepository            *JobRepository
	jobLogRepository         *JobLogRepository
	loginLogRepository       *LoginLogRepository
	storageRepository        *StorageRepository
	strategyRepository       *StrategyRepository
)
